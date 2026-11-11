import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import {
  ArrowDownToLine,
  AudioLines,
  Check,
  ChevronDown,
  FileAudio2,
  Globe2,
  LogIn,
  Moon,
  Music2,
  Plus,
  Settings2,
  Sparkles,
  Sun,
  Upload,
  X,
  Zap,
} from 'lucide-react'
import { zipSync } from 'fflate'
import {
  DEFAULT_PROFILE,
  PROFILE_FIELDS,
  TAG_FIELDS,
  analyzeAudio,
  formatDuration,
  suggest,
  type AudioAnalysis,
  type AudioFormat,
  type Inspection,
  type Profile,
  type TagSet,
} from './lib/untag'
import {
  auth,
  db,
  firebaseConfigured,
  googleProvider,
} from './lib/firebase'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { fieldName, groupName, metadataLabel, metadataValue, translate, type Language } from './translations'

type Theme = 'dark' | 'light'

interface AudioEntry {
  id: string
  file: File
  inspection?: Inspection
  tags?: TagSet
  result?: Inspection
  cleaned?: Blob
  local: boolean
  working: boolean
  cleaning: boolean
  analyzing?: boolean
  analysis?: AudioAnalysis
  analysisError?: string
  error?: string
}



function readStoredProfile(): Profile {
  try {
    const stored = localStorage.getItem('untag-profile')
    return stored ? { ...DEFAULT_PROFILE, ...JSON.parse(stored) } : DEFAULT_PROFILE
  } catch {
    return DEFAULT_PROFILE
  }
}

function imageBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  }
  return btoa(binary)
}

function base64Url(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64Bytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function workerRequest<T>(request: {
  operation: 'inspect' | 'clean'
  bytes: ArrayBuffer
  filename: string
  format?: AudioFormat
  tags?: TagSet
}): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./lib/untag/audio.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent<{ result?: T; error?: string }>) => {
      worker.terminate()
      if (event.data.error) reject(new Error(event.data.error))
      else resolve(event.data.result as T)
    }
    worker.onerror = (event) => {
      worker.terminate()
      reject(new Error(event.message || 'Audio worker failed.'))
    }
    worker.postMessage(request, [request.bytes])
  })
}

async function inspectOnDevice(file: File): Promise<Inspection> {
  const bytes = await file.arrayBuffer()
  return workerRequest<Inspection>({ operation: 'inspect', bytes, filename: file.name })
}

async function inspectThroughApi(file: File): Promise<Inspection> {
  const response = await fetch('/api/inspect', {
    method: 'POST',
    headers: { 'X-Filename': file.name, 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  })
  if (!response.ok) throw new Error(await responseMessage(response))
  return response.json() as Promise<Inspection>
}

async function responseMessage(response: Response): Promise<string> {
  try {
    const body = await response.json() as { error?: string }
    return body.error || `Request failed (${response.status}).`
  } catch {
    return `Request failed (${response.status}).`
  }
}

async function inspectBlob(blob: Blob, filename: string): Promise<{ result: Inspection; local: boolean }> {
  try {
    const response = await fetch('/api/inspect', {
      method: 'POST',
      headers: { 'X-Filename': filename, 'Content-Type': blob.type || 'application/octet-stream' },
      body: blob,
    })
    if (!response.ok) throw new Error(await responseMessage(response))
    return { result: await response.json() as Inspection, local: false }
  } catch {
    const bytes = await blob.arrayBuffer()
    return { result: await workerRequest<Inspection>({ operation: 'inspect', bytes, filename }), local: true }
  }
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function userFacingError(error: unknown, language: Language): string {
  const message = error instanceof Error ? error.message : ''
  if (/RF64/i.test(message)) return language === 'nl' ? 'RF64 WAV-bestanden worden niet ondersteund.' : 'RF64 WAV files are not supported.'
  if (/Only MP3 and WAV/i.test(message)) return language === 'nl' ? 'Alleen MP3- en WAV-bestanden worden ondersteund.' : 'Only MP3 and WAV files are supported.'
  if (/100 MB/i.test(message)) return language === 'nl' ? 'Bestanden mogen maximaal 100 MB zijn.' : 'Files must be 100 MB or smaller.'
  return message || (language === 'nl' ? 'Verwerken is niet gelukt.' : 'Processing failed.')
}

function App() {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('untag-language') as Language) || 'nl')
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('untag-theme') as Theme) || 'dark')
  const [profile, setProfile] = useState<Profile>(readStoredProfile)
  const [entries, setEntries] = useState<AudioEntry[]>([])
  const [dragging, setDragging] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [notice, setNotice] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [zipBusy, setZipBusy] = useState(false)
  const [toast, setToast] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key)

  const groups = useMemo(() => [...new Set(TAG_FIELDS.map(({ group }) => group))], [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('untag-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('untag-language', language)
    document.documentElement.lang = language
  }, [language])

  useEffect(() => {
    if (!auth) return
    return onAuthStateChanged(auth, (nextUser) => setUser(nextUser))
  }, [])

  useEffect(() => {
    if (!user || !db) return
    void getDoc(doc(db, 'profiles', user.uid)).then((snapshot) => {
      if (snapshot.exists()) {
        const cloudProfile = { ...DEFAULT_PROFILE, ...snapshot.data() } as Profile
        setProfile(cloudProfile)
        localStorage.setItem('untag-profile', JSON.stringify(cloudProfile))
      }
    }).catch(() => undefined)
  }, [user])

  const setEntry = useCallback((id: string, update: Partial<AudioEntry>) => {
    setEntries((current) => current.map((entry) => entry.id === id ? { ...entry, ...update } : entry))
  }, [])

  const runAnalysis = useCallback(async (entry: AudioEntry, autoApply = false) => {
    if (entry.analyzing) return
    setEntry(entry.id, { analyzing: true, analysisError: undefined })
    try {
      const analysis = await analyzeAudio(entry.file)
      setEntries((current) => current.map((item) => {
        if (item.id !== entry.id) return item
        const shouldFillBpm = autoApply && item.tags && !item.tags.bpm
        const shouldFillKey = autoApply && item.tags && !item.tags.initialkey
        const nextTags = item.tags && (shouldFillBpm || shouldFillKey)
          ? {
              ...item.tags,
              bpm: shouldFillBpm ? String(analysis.bpm) : item.tags.bpm,
              initialkey: shouldFillKey ? analysis.standardKey : item.tags.initialkey,
            }
          : item.tags
        return {
          ...item,
          analyzing: false,
          analysis,
          analysisError: undefined,
          tags: nextTags,
        }
      }))
      setToast(language === 'nl' ? `Essentia: ${analysis.bpm} BPM • ${analysis.displayKey}` : `Essentia: ${analysis.bpm} BPM • ${analysis.displayKey}`)
      window.setTimeout(() => setToast(''), 3000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed'
      console.warn('Essentia analysis error:', err)
      setEntry(entry.id, { analyzing: false, analysisError: message })
    }
  }, [language, setEntry])


  const applyAnalysis = useCallback((entry: AudioEntry) => {
    if (!entry.analysis || !entry.tags) return
    setEntries((current) => current.map((item) => {
      if (item.id !== entry.id || !item.tags || !item.analysis) return item
      return {
        ...item,
        tags: {
          ...item.tags,
          bpm: String(item.analysis.bpm),
          initialkey: item.analysis.standardKey,
        },
      }
    }))
    setToast(language === 'nl' ? 'BPM & Key overgenomen in metadata' : 'BPM & Key applied to metadata')
    window.setTimeout(() => setToast(''), 2400)
  }, [language])

  const processFile = useCallback(async (entry: AudioEntry) => {
    try {
      let inspection: Inspection
      let local = false
      try {
        inspection = await inspectThroughApi(entry.file)
      } catch {
        inspection = await inspectOnDevice(entry.file)
        local = true
      }
      setEntry(entry.id, { inspection, tags: suggest(inspection, entry.file.name, profile), local, working: false })
      void runAnalysis(entry, true)
    } catch (error) {
      setEntry(entry.id, { working: false, error: userFacingError(error, language) })
    }
  }, [profile, setEntry, language, runAnalysis])

  const analyzeAll = useCallback(async () => {
    const unanalyzed = entries.filter((item) => !item.analysis && !item.analyzing)
    for (const item of unanalyzed) {
      await runAnalysis(item, true)
    }
  }, [entries, runAnalysis])


  const addFiles = useCallback((files: FileList | File[]) => {
    const supported = Array.from(files).filter((file) => /\.(mp3|wav)$/i.test(file.name))
    const oversized = supported.filter((file) => file.size > 100 * 1024 * 1024)
    if (oversized.length) setNotice(t('fileTooLarge'))
    if (supported.length !== files.length) setNotice(t('maxFiles'))
    const accepted = supported.filter((file) => file.size <= 100 * 1024 * 1024)
    const added = accepted.map((file) => ({
      id: crypto.randomUUID(),
      file,
      local: false,
      working: true,
      cleaning: false,
    }))
    setEntries((current) => [...current, ...added])
    added.forEach((entry) => void processFile(entry))
  }, [processFile, language])

  const updateTag = (id: string, key: keyof TagSet, value: string | TagSet['cover']) => {
    setEntries((current) => current.map((entry) => entry.id === id && entry.tags
      ? { ...entry, tags: { ...entry.tags, [key]: value } }
      : entry))
  }

  const applyShared = (entry: AudioEntry) => {
    if (!entry.tags) return
    const shared = Object.fromEntries(PROFILE_FIELDS.map(({ key }) => [key, entry.tags?.[key]])) as Partial<TagSet>
    setEntries((current) => current.map((other) => other.id !== entry.id && other.tags
      ? { ...other, tags: { ...other.tags, ...shared } }
      : other))
    setToast(language === 'nl' ? 'Gedeelde metadata toegepast' : 'Shared metadata applied')
    window.setTimeout(() => setToast(''), 2400)
  }

  const cleanEntry = async (entry: AudioEntry, shouldDownload = true): Promise<Blob | undefined> => {
    if (!entry.tags || !entry.inspection) return undefined
    setEntry(entry.id, { cleaning: true, error: undefined })
    try {
      let output: Blob
      let local = false
      try {
        let response: Response
        if (entry.tags.cover?.data) {
          const form = new FormData()
          const tags = { ...entry.tags, cover: null }
          form.append('file', entry.file, entry.file.name)
          form.append('tags', JSON.stringify(tags))
          form.append('cover', new File([base64Bytes(entry.tags.cover.data)], 'cover-image', { type: entry.tags.cover.mime }))
          response = await fetch('/api/clean', { method: 'POST', body: form })
        } else {
          response = await fetch('/api/clean', {
            method: 'POST',
            headers: {
              'X-Filename': entry.file.name,
              'X-Tags': base64Url(JSON.stringify(entry.tags)),
              'Content-Type': entry.file.type || 'application/octet-stream',
            },
            body: entry.file,
          })
        }
        if (!response.ok) throw new Error(await responseMessage(response))
        output = await response.blob()
      } catch {
        const bytes = await entry.file.arrayBuffer()
        const cleaned = await workerRequest<ArrayBuffer>({
          operation: 'clean',
          bytes,
          filename: entry.file.name,
          format: entry.inspection.format,
          tags: entry.tags,
        })
        output = new Blob([cleaned], { type: entry.inspection.format === 'wav' ? 'audio/wav' : 'audio/mpeg' })
        local = true
      }
      const inspected = await inspectBlob(output, entry.file.name)
      local ||= inspected.local
      setEntry(entry.id, { cleaned: output, result: inspected.result, cleaning: false, local: entry.local || local })
      if (shouldDownload) download(output, entry.file.name)
      if (user && db) {
        const savedTags = Object.fromEntries(Object.entries(entry.tags).filter(([key]) => key !== 'cover'))
        await setDoc(doc(db, 'users', user.uid, 'jobs', crypto.randomUUID()), { tags: savedTags })
      }
      return output
    } catch (error) {
      setEntry(entry.id, { cleaning: false, error: userFacingError(error, language) })
      return undefined
    }
  }

  const cleanAll = async () => {
    const pending = entries.filter((entry) => entry.inspection && !entry.cleaned)
    for (const entry of pending) await cleanEntry(entry)
  }

  const downloadZip = async () => {
    setZipBusy(true)
    try {
      const files: Record<string, Uint8Array> = {}
      for (const entry of entries.filter((item) => item.inspection)) {
        const blob = entry.cleaned ?? await cleanEntry(entry, false)
        if (!blob) continue
        const duplicate = entries.filter((candidate) => candidate.file.name === entry.file.name).length > 1
        const extension = entry.file.name.match(/(\.[^.]+)$/)?.[1] ?? ''
        const base = entry.file.name.replace(/(\.[^.]+)$/, '')
        const filename = duplicate ? `${base}-${entry.id.slice(0, 6)}${extension}` : entry.file.name
        files[filename] = new Uint8Array(await blob.arrayBuffer())
      }
      if (Object.keys(files).length) download(new Blob([zipSync(files)]), 'untag-cleaned.zip')
    } finally {
      setZipBusy(false)
    }
  }

  const saveProfile = async (next: Profile) => {
    setProfile(next)
    localStorage.setItem('untag-profile', JSON.stringify(next))
    if (user && db) {
      try {
        await setDoc(doc(db, 'profiles', user.uid), next)
      } catch {
        setNotice(t('saveError'))
      }
    }
    setShowProfile(false)
    setToast(t('saved'))
    window.setTimeout(() => setToast(''), 2400)
  }

  const handleCover = async (id: string, file?: File) => {
    if (!file) return
    if (file.size > 10 * 1024 * 1024 || !['image/jpeg', 'image/png'].includes(file.type)) {
      setNotice(language === 'nl' ? 'Kies een afbeelding tot 10 MB.' : 'Choose an image up to 10 MB.')
      return
    }
    const data = imageBase64(new Uint8Array(await file.arrayBuffer()))
    updateTag(id, 'cover', { mime: file.type, data })
  }

  const handleDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    addFiles(event.dataTransfer.files)
  }

  const logo = theme === 'dark' ? '/jdlogo-dark-transparent.png' : '/jdlogo-mark-light.png'
  const readyCount = entries.filter(({ cleaned }) => cleaned).length

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="untag home">
          <img src={logo} className="brand-mark" alt="JD" />
          <span className="brand-word">untag<span className="brand-period">.</span></span>
        </a>
        <div className="header-actions">
          <span className="secure-label"><span className="secure-dot" />{language === 'nl' ? 'Alleen jij, altijd' : 'Only you, always'}</span>
          <button className="icon-button" onClick={() => setLanguage(language === 'nl' ? 'en' : 'nl')} aria-label={t('language')} title={t('language')}>
            <Globe2 size={17} /><span className="toggle-label">{language.toUpperCase()}</span>
          </button>
          <button className="icon-button theme-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={t('theme')} title={t('theme')}>
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button className="profile-button" onClick={() => setShowProfile(true)}>
            <Settings2 size={16} /><span>{t('profile')}</span>
          </button>
          {firebaseConfigured && (
            <button className="login-button" onClick={() => user ? void signOut(auth!) : setShowAuth(true)}>
              <LogIn size={16} /><span>{user ? t('logout') : t('login')}</span>
            </button>
          )}
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-mark"><Sparkles size={14} /></span>{t('kicker')}</div>
            <h1>{t('headline')}</h1>
            <p>{t('intro')}</p>
            <div className="hero-proof">
              <span><Check size={15} />{language === 'nl' ? 'Geen hercodering' : 'No re-encoding'}</span>
              <span><Check size={15} />{language === 'nl' ? 'Geen bestanden opgeslagen' : 'No files stored'}</span>
            </div>
          </div>
          <div className="hero-orbit" aria-hidden="true"><div className="orbit-ring orbit-one" /><div className="orbit-ring orbit-two" /><div className="orbit-ring orbit-three" /><div className="orbit-core"><AudioLines size={30} /></div></div>
        </section>

        <section
          className={`upload-panel ${dragging ? 'is-dragging' : ''}`}
          onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false) }}
          onDrop={handleDrop}
        >
          <input ref={inputRef} type="file" accept=".mp3,.wav,audio/mpeg,audio/wav" multiple hidden onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = '' }} />
          <div className="upload-icon"><Upload size={22} /></div>
          <h2>{t('dropTitle')}</h2>
          <p>{t('dropSubtitle')}</p>
          <button className="primary-button choose-button" onClick={() => inputRef.current?.click()}><Plus size={17} />{t('choose')}</button>
          <span className="format-note">{t('formats')}</span>
        </section>

        {notice && <div className="notice-banner" role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label={t('close')}><X size={15} /></button></div>}

        {entries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-symbol"><FileAudio2 size={21} /></div>
            <p>{t('emptyQueue')}</p>
          </div>
        ) : (
          <section className="file-list">
            <div className="list-heading">
              <div><div className="section-eyebrow">{language === 'nl' ? 'WERKRUIMTE' : 'WORKSPACE'}</div><h2>{language === 'nl' ? 'Jouw bestanden' : 'Your files'} <span className="count-pill">{entries.length}</span></h2></div>
              <div className="batch-actions">
                <button className="soft-button" onClick={() => void analyzeAll()} title={t('analyze')}><Sparkles size={15} />{t('analyze')}</button>
                {entries.length > 1 && <button className="soft-button" onClick={() => void cleanAll()}><Zap size={15} />{t('clean')}</button>}
                {entries.length > 1 && <button className="primary-button zip-button" onClick={() => void downloadZip()} disabled={zipBusy}>{zipBusy ? <span className="spinner" /> : <ArrowDownToLine size={16} />}{t('downloadZip')}</button>}
              </div>
            </div>

            {entries.map((entry) => (
              <article className="file-card" key={entry.id}>
                <div className="file-card-header">
                  <div className="file-heading">
                    <div className="file-icon"><Music2 size={19} /></div>
                    <div className="file-title-block">
                      <h3 title={entry.file.name}>{entry.file.name}</h3>
                      <div className="file-meta">
                        <span className="format-chip">{entry.inspection?.format.toUpperCase() ?? 'AUDIO'}</span>
                        {entry.inspection && <span>{formatBytes(entry.file.size)}</span>}
                        {entry.inspection && <span>{formatDuration(entry.inspection.duration)}</span>}
                        {entry.inspection && <AudioSummary inspection={entry.inspection} language={language} t={t} />}
                      </div>
                    </div>
                  </div>
                  <div className="file-status">
                    {entry.working ? <><span className="spinner" />{t('working')}</> : entry.error ? <span className="status-error">{t('failed')}</span> : entry.cleaned ? <span className="status-done"><Check size={14} />{language === 'nl' ? 'Schoon' : 'Clean'}</span> : <span className="status-ready"><span />{language === 'nl' ? 'Klaar' : 'Ready'}</span>}
                    <button className="remove-file" onClick={() => setEntries((current) => current.filter(({ id }) => id !== entry.id))} aria-label={t('remove')} title={t('remove')}><X size={16} /></button>
                  </div>
                </div>

                {entry.analyzing ? (
                  <div className="analysis-strip">
                    <div className="analysis-left">
                      <span className="analysis-brand"><Sparkles size={13} className="spinner" /> Essentia.js</span>
                      <span className="analysis-confidence">{t('analyzing')}</span>
                    </div>
                  </div>
                ) : entry.analysis ? (
                  <div className="analysis-strip">
                    <div className="analysis-left">
                      <span className="analysis-brand"><Sparkles size={13} /> Essentia.js</span>
                      <span className="analysis-pill"><b>{entry.analysis.bpm}</b> BPM</span>
                      <span className="analysis-pill">{entry.analysis.displayKey}</span>
                      {entry.analysis.danceability !== undefined && (
                        <span className="analysis-pill">Dance: {Math.round(entry.analysis.danceability * 100)}%</span>
                      )}
                      <span className="analysis-confidence">
                        Key: {Math.round(entry.analysis.confidenceKey * 100)}% · BPM: {Math.round(entry.analysis.confidenceBpm * 100)}%
                      </span>
                    </div>
                    <div>
                      {entry.tags && (entry.tags.bpm !== String(entry.analysis.bpm) || entry.tags.initialkey !== entry.analysis.standardKey) ? (
                        <button className="text-button analysis-btn" onClick={() => applyAnalysis(entry)}>
                          <Check size={12} />{t('applyAnalysis')}
                        </button>
                      ) : (
                        <span className="success-label"><Check size={12} />{t('analysisDone')}</span>
                      )}
                    </div>
                  </div>
                ) : null}

                {entry.local && <div className="local-note"><Zap size={13} />{t('local')}</div>}
                {entry.error && <div className="error-note">{entry.error}</div>}
                {entry.analysisError && (
                  <div className="error-note" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span>{language === 'nl' ? `Analyse mislukt: ${entry.analysisError}` : `Analysis failed: ${entry.analysisError}`}</span>
                    <button className="text-button" style={{ height: '24px', padding: '0 6px' }} onClick={() => void runAnalysis(entry, false)}>
                      {language === 'nl' ? 'Opnieuw' : 'Retry'}
                    </button>
                  </div>
                )}


                {entry.inspection && (
                  <>
                    <section className="metadata-section found-section">
                      <div className="section-title-line">
                        <h4><span className="section-icon"><Sparkles size={15} /></span>{t('found')} <span className="subtle-count">{entry.inspection.items.length}</span></h4>
                        {entry.inspection.suno?.id && <span className="ai-badge"><Sparkles size={12} />{t('aiSuno')}</span>}
                      </div>
                      {entry.inspection.items.length === 0 ? <p className="no-metadata">{t('noMetadata')}</p> : (
                        <div className="table-wrap">
                          <table className="metadata-table">
                            <thead><tr><th>{t('container')}</th><th>{t('id')}</th><th>{t('field')}</th><th>{t('value')}</th></tr></thead>
                            <tbody>{entry.inspection.items.map((item, index) => {
                              const isSuno = /suno|made with/i.test(item.value)
                              const isWoas = item.id === 'WOAS' || item.id === 'WAS'
                              const long = item.value.length > 170
                              return <tr key={`${item.id}-${index}`} className={isSuno || isWoas ? 'suno-row' : ''}>
                                <td><span className="container-chip">{item.container}</span></td>
                                <td><code>{item.id}</code></td>
                                <td>{metadataLabel(language, item.label)}</td>
                                <td>
                                  {long ? <details className="long-value"><summary>{metadataValue(language, item.value.slice(0, 130))}...<ChevronDown size={13} /></summary><p>{metadataValue(language, item.value)}</p></details> : <span className="metadata-value">{metadataValue(language, item.value)}</span>}
                                  {isSuno && <span className="inline-ai">{t('aiSuno')}</span>}
                                  {(isWoas || isSuno) && (
                                    <span className="inline-clean-hint" title={language === 'nl' ? 'Wordt in de bounce vervangen door jouw ingestelde profielwaarde' : 'Replaced in bounce by your configured profile'}>
                                      <Check size={10} /> {t('willBeCleaned')}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            })}</tbody>
                          </table>
                        </div>
                      )}
                    </section>

                    <section className="metadata-section edit-section">
                      <div className="section-title-line edit-heading">
                        <h4><span className="section-icon"><Settings2 size={15} /></span>{t('newTags')}</h4>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="text-button" onClick={() => void runAnalysis(entry, false)} disabled={entry.analyzing}>
                            <Sparkles size={14} />{t('analyze')}
                          </button>
                          {entries.length > 1 && <button className="text-button" onClick={() => applyShared(entry)}><Zap size={14} />{t('applyAll')}</button>}
                        </div>
                      </div>

                      <div className="tag-groups">
                        {groups.map((group) => (
                          <fieldset className="tag-group" key={group}>
                            <legend>{groupName(language, group)}</legend>
                            <div className="field-grid">
                              {TAG_FIELDS.filter((field) => field.group === group).map(({ key }) => {
                                const currentValue = entry.tags?.[key]
                                const multiline = key === 'lyrics' || key === 'comment'
                                return <label className={`form-field ${multiline ? 'wide-field' : ''}`} key={key}>
                                  <span>{fieldName(language, key)}</span>
                                  {multiline ? <textarea rows={key === 'lyrics' ? 4 : 2} value={typeof currentValue === 'string' ? currentValue : ''} onChange={(event) => updateTag(entry.id, key, event.target.value)} /> : <input type="text" value={typeof currentValue === 'string' ? currentValue : ''} onChange={(event) => updateTag(entry.id, key, event.target.value)} />}
                                </label>
                              })}
                            </div>
                          </fieldset>
                        ))}
                        <fieldset className="tag-group cover-group">
                          <legend>{t('cover')}</legend>
                          <div className="cover-control">
                            <label className="cover-picker">
                              <Upload size={15} /><span>{t('cover')}</span>
                              <input type="file" accept="image/jpeg,image/png" hidden onChange={(event) => { void handleCover(entry.id, event.target.files?.[0]); event.target.value = '' }} />
                            </label>
                            <span>{entry.tags?.cover ? entry.tags.cover.mime : t('coverHint')}</span>
                            {entry.tags?.cover && <button className="text-button remove-cover" onClick={() => updateTag(entry.id, 'cover', null)}><X size={13} />{t('removeCover')}</button>}
                          </div>
                        </fieldset>
                      </div>
                      <div className="card-actions">
                        {entry.cleaned && <span className="success-label"><Check size={14} />{language === 'nl' ? 'Resultaat gecontroleerd' : 'Output verified'}</span>}
                        <button className="primary-button clean-button" disabled={entry.working || entry.cleaning || !entry.tags} onClick={() => void cleanEntry(entry)}>
                          {entry.cleaning ? <span className="spinner" /> : entry.cleaned ? <ArrowDownToLine size={16} /> : <Zap size={16} />}
                          {entry.cleaning ? t('cleaning') : entry.cleaned ? t('cleanAgain') : t('clean')}
                        </button>
                      </div>
                    </section>

                    {entry.result && (
                      <section className="metadata-section result-section">
                        <div className="section-title-line"><h4><span className="section-icon result-icon"><Check size={15} /></span>{t('result')} <span className="subtle-count">{entry.result.items.length}</span></h4><span className="result-proof"><Check size={13} />{language === 'nl' ? 'Opnieuw gecontroleerd' : 'Re-inspected'}</span></div>
                        <div className="result-tags">{entry.result.items.map((item, index) => <span className="result-tag" key={`${item.id}-${index}`}><b>{item.id}</b><span>{item.value.length > 55 ? `${item.value.slice(0, 55)}...` : item.value}</span></span>)}</div>
                      </section>
                    )}
                  </>
                )}
              </article>
            ))}
            {readyCount > 0 && <div className="ready-footer"><Check size={15} />{readyCount} {language === 'nl' ? 'bestand(en) klaar' : 'file(s) ready'}</div>}
          </section>
        )}
      </main>

      <footer className="footer">
        <a className="footer-brand" href="https://www.jamaldrenthe.com" target="_blank" rel="noreferrer"><img src={logo} alt="JD" /><span>{t('footerBrand')}</span></a>
        <p><span className="privacy-dot" />{t('footerPrivacy')}</p>
        <a className="footer-link" href="https://www.jamaldrenthe.com" target="_blank" rel="noreferrer">jamaldrenthe.com <Globe2 size={13} /></a>
      </footer>

      {showProfile && <ProfileModal initial={profile} language={language} onClose={() => setShowProfile(false)} onSave={(next) => void saveProfile(next)} />}
      {showAuth && <AuthModal language={language} onClose={() => setShowAuth(false)} onLogin={() => setShowAuth(false)} />}
      {toast && <div className="toast"><Check size={15} />{toast}</div>}
    </div>
  )
}

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}

function AudioSummary({ inspection, language, t }: { inspection: Inspection; language: Language; t: (key: Parameters<typeof translate>[1]) => string }) {
  const parts = [
    inspection.audio.codec
      ? language === 'nl' && inspection.audio.codec === 'IEEE float' ? 'IEEE zwevendekomma' : inspection.audio.codec.replace('WAVE codec', language === 'nl' ? 'WAVE-codec' : 'WAVE codec')
      : inspection.audio.bitrate ? `${Math.round(inspection.audio.bitrate / 1000)} kbps` : '',
    inspection.audio.samplerate ? `${(inspection.audio.samplerate / 1000).toFixed(1)} kHz` : '',
    inspection.audio.channels ? `${inspection.audio.channels} ${t('channels').toLowerCase()}` : '',
    inspection.audio.bitsPerSample ? `${inspection.audio.bitsPerSample} ${t('bits').toLowerCase()}` : '',
  ].filter(Boolean)
  return parts.length ? <span className="audio-details" title={`${t('audioInfo')}: ${parts.join(', ')}`}>{parts.join(' · ')}</span> : null
}

function ProfileModal({ initial, language, onClose, onSave }: {
  initial: Profile
  language: Language
  onClose: () => void
  onSave: (profile: Profile) => void
}) {
  const [draft, setDraft] = useState<Profile>(initial)
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key)
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="modal profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title">
      <div className="modal-heading"><div><span className="section-eyebrow">{language === 'nl' ? 'JOUW STANDAARDEN' : 'YOUR DEFAULTS'}</span><h2 id="profile-title">{t('profileTitle')}</h2><p>{t('profileIntro')}</p></div><button className="icon-button" onClick={onClose} aria-label={t('close')}><X size={18} /></button></div>
      <div className="profile-grid">
        {PROFILE_FIELDS.map(({ key }) => <label className="form-field" key={key}><span>{fieldName(language, key)}</span><input value={String(draft[key as keyof Profile] ?? '')} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} /></label>)}
      </div>
      <div className="modal-actions"><button className="soft-button" onClick={onClose}>{t('cancel')}</button><button className="primary-button" onClick={() => onSave(draft)}><Check size={15} />{t('save')}</button></div>
    </section>
  </div>
}

function AuthModal({ language, onClose, onLogin }: { language: Language; onClose: () => void; onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key)
  const submit = async () => {
    if (!email || !password || !auth) {
      setError(t('loginRequired'))
      return
    }
    setBusy(true)
    setError('')
    try {
      if (creating) await createUserWithEmailAndPassword(auth, email, password)
      else await signInWithEmailAndPassword(auth, email, password)
      onLogin()
    } catch {
      setError(t('loginError'))
    } finally {
      setBusy(false)
    }
  }
  const google = async () => {
    if (!auth) return
    setBusy(true)
    setError('')
    try {
      await signInWithPopup(auth, googleProvider)
      onLogin()
    } catch {
      setError(t('loginError'))
    } finally {
      setBusy(false)
    }
  }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="modal auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div className="modal-heading"><div><span className="section-eyebrow">{language === 'nl' ? 'PRIVÉ PROFIEL' : 'PRIVATE PROFILE'}</span><h2 id="auth-title">{t('login')}</h2></div><button className="icon-button" onClick={onClose} aria-label={t('close')}><X size={18} /></button></div>
      <p className="auth-description">{t('authCloud')}</p>
      <button className="google-button" onClick={() => void google()} disabled={busy}><span className="google-g">G</span>{t('googleLogin')}</button>
      <div className="auth-divider"><span>{language === 'nl' ? 'of met e-mail' : 'or with email'}</span></div>
      <label className="form-field"><span>{t('email')}</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label className="form-field"><span>{t('password')}</span><input type="password" autoComplete={creating ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      {error && <p className="auth-error">{error}</p>}
      <button className="primary-button auth-submit" onClick={() => void submit()} disabled={busy}>{busy ? <span className="spinner" /> : <LogIn size={15} />}{creating ? t('register') : t('emailLogin')}</button>
      <button className="auth-switch" onClick={() => { setCreating((current) => !current); setError('') }}>{creating ? t('switchLogin') : t('switchRegister')}</button>
      <p className="auth-local-note">{t('authLocal')}</p>
    </section>
  </div>
}

export default App
