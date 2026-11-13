import React, { useState } from 'react'
import {
  ArrowRight,
  AudioLines,
  Check,
  ChevronDown,
  Cpu,
  FileAudio2,
  FolderArchive,
  Globe2,
  Layers,
  Lock,
  Moon,
  Radio,
  ShieldCheck,
  Sparkles,
  Sun,
  UploadCloud,
  Zap,
} from 'lucide-react'
import type { Language } from './translations'

interface LandingPageProps {
  language: Language
  theme: 'dark' | 'light'
  onSwitchLanguage: (lang: Language) => void
  onSwitchTheme: (theme: 'dark' | 'light') => void
  onOpenApp: () => void
  onDropFiles?: (files: FileList) => void
}

export function LandingPage({
  language,
  theme,
  onSwitchLanguage,
  onSwitchTheme,
  onOpenApp,
  onDropFiles,
}: LandingPageProps) {
  const [activeTab, setActiveTab] = useState<'dirty' | 'clean'>('dirty')
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [dragOver, setDragOver] = useState(false)

  const isNl = language === 'nl'
  const logo = theme === 'dark' ? '/jdlogo-dark-transparent.png' : '/jdlogo-mark-light.png'

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (onDropFiles) onDropFiles(e.dataTransfer.files)
      onOpenApp()
    }
  }

  return (
    <div className="landing-container">
      {/* ── Topbar Navigation ── */}
      <header className="landing-nav">
        <a href="#hero" className="brand" aria-label="untag logo">
          <img src={logo} className="brand-mark" alt="Jamal Drenthe Logo" />
          <span className="brand-word">
            untag<span className="brand-period">.</span>
          </span>
        </a>

        <nav className="landing-menu" aria-label="Hoofdnavigatie">
          <a href="#features" className="nav-link">
            {isNl ? 'Mogelijkheden' : 'Features'}
          </a>
          <a href="#showcase" className="nav-link">
            {isNl ? 'Voor & Na' : 'Before & After'}
          </a>
          <a href="#how-it-works" className="nav-link">
            {isNl ? 'Hoe het werkt' : 'How it works'}
          </a>
          <a href="#engine" className="nav-link">
            {isNl ? 'Essentia.js WASM' : 'Essentia WASM'}
          </a>
          <a href="#comparison" className="nav-link">
            {isNl ? 'Vergelijking' : 'Comparison'}
          </a>
          <a href="#faq" className="nav-link">
            FAQ
          </a>
        </nav>

        <div className="landing-nav-actions">
          <button
            className="icon-button"
            onClick={() => onSwitchLanguage(isNl ? 'en' : 'nl')}
            aria-label={isNl ? 'Switch to English' : 'Wissel naar Nederlands'}
            title={isNl ? 'Switch to English' : 'Wissel naar Nederlands'}
          >
            <Globe2 size={16} />
            <span className="toggle-label">{language.toUpperCase()}</span>
          </button>
          <button
            className="icon-button theme-button"
            onClick={() => onSwitchTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={isNl ? 'Thema wisselen' : 'Toggle theme'}
            title={isNl ? 'Thema wisselen' : 'Toggle theme'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="landing-cta-btn" onClick={onOpenApp}>
            <span>{isNl ? 'Open Webapp' : 'Launch Webapp'}</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section id="hero" className="landing-hero">
        <div className="landing-badge">
          <span className="landing-badge-dot" />
          <Sparkles size={13} className="landing-badge-icon" />
          <span>
            {isNl
              ? 'Professionele Audio Metadata Sanitizer & WASM Engine'
              : 'Professional Audio Metadata Sanitizer & WASM Engine'}
          </span>
        </div>

        <h1 className="landing-title">
          {isNl ? (
            <>
              Bevrijd je muziek van <br className="hidden sm:inline" />
              <span className="text-highlight">verborgen AI-tags</span>.
            </>
          ) : (
            <>
              Free your music from <br className="hidden sm:inline" />
              <span className="text-highlight">hidden AI tags</span>.
            </>
          )}
        </h1>

        <p className="landing-subtitle">
          {isNl
            ? 'Verwijder Suno- en Udio-watermarks, zuiver verborgen bron-URL’s (WOAS), detecteer automatisch BPM en toonsoort met Essentia.js WASM en exporteer bit-perfecte audio zonder kwaliteitsverlies.'
            : 'Strip Suno and Udio watermarks, sanitize hidden source URLs (WOAS), automatically detect BPM & musical key with Essentia.js WASM, and export bit-perfect audio with zero quality loss.'}
        </p>

        <div className="landing-hero-actions">
          <button className="landing-primary-btn" onClick={onOpenApp}>
            <Zap size={17} />
            <span>{isNl ? 'Start direct in de Webapp' : 'Open untag Studio Webapp'}</span>
            <ArrowRight size={17} />
          </button>
          <a href="#showcase" className="landing-secondary-btn">
            <span>{isNl ? 'Bekijk interactieve demo' : 'View interactive demo'}</span>
            <ChevronDown size={16} />
          </a>
        </div>

        <div className="landing-trust-bar">
          <div className="trust-item">
            <ShieldCheck size={16} className="text-mint" />
            <span>{isNl ? '100% In-browser Privacy (Geen uploads)' : '100% In-browser Privacy (No uploads)'}</span>
          </div>
          <div className="trust-item">
            <Check size={16} className="text-mint" />
            <span>{isNl ? 'Zero Re-encoding (Bit-perfecte masters)' : 'Zero Re-encoding (Bit-perfect audio)'}</span>
          </div>
          <div className="trust-item">
            <Cpu size={16} className="text-mint" />
            <span>{isNl ? 'Essentia.js C++ WebAssembly' : 'Essentia.js C++ WebAssembly'}</span>
          </div>
          <div className="trust-item">
            <Layers size={16} className="text-mint" />
            <span>{isNl ? 'ID3v2.4 & Broadcast WAV Chunks' : 'ID3v2.4 & Broadcast WAV Chunks'}</span>
          </div>
        </div>

        {/* ── Drag & Drop Quick Launcher ── */}
        <div
          className={`landing-dropzone ${dragOver ? 'is-dragover' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={onOpenApp}
        >
          <div className="dropzone-inner">
            <div className="dropzone-icon">
              <UploadCloud size={24} />
            </div>
            <div className="dropzone-text">
              <h3>{isNl ? 'Sleep een MP3 of WAV direct hierheen' : 'Drop an MP3 or WAV directly here'}</h3>
              <p>
                {isNl
                  ? 'Of klik om direct naar de webapp te gaan • Tot 100 MB per bestand'
                  : 'Or click to jump straight to the webapp • Up to 100 MB per file'}
              </p>
            </div>
            <button className="dropzone-btn" onClick={(e) => { e.stopPropagation(); onOpenApp(); }}>
              {isNl ? 'Open Webapp' : 'Open Webapp'}
            </button>
          </div>
        </div>
      </section>

      {/* ── Interactive Before & After Showcase ── */}
      <section id="showcase" className="landing-section">
        <div className="section-head text-center">
          <span className="section-kicker">{isNl ? 'INTERACTIEVE DEMO' : 'INTERACTIVE DEMO'}</span>
          <h2>
            {isNl ? 'Wat gebeurt er echt onder de motorkap?' : 'What really happens under the hood?'}
          </h2>
          <p>
            {isNl
              ? 'Bekijk hoe untag schadelijke AI-watermarks, tracking-URL’s en ongeldige headers vervangt door professionele producer-metadata.'
              : 'See how untag purges algorithmic watermarks, tracking URLs, and unstandardized headers with clean studio-grade metadata.'}
          </p>
        </div>

        <div className="showcase-card">
          <div className="showcase-tabs">
            <button
              className={`showcase-tab ${activeTab === 'dirty' ? 'active is-dirty' : ''}`}
              onClick={() => setActiveTab('dirty')}
            >
              <span className="tab-indicator is-dirty" />
              <span>{isNl ? '1. Originele AI-track (Suno / Udio)' : '1. Original AI Track (Suno / Udio)'}</span>
            </button>
            <button
              className={`showcase-tab ${activeTab === 'clean' ? 'active is-clean' : ''}`}
              onClick={() => setActiveTab('clean')}
            >
              <span className="tab-indicator is-clean" />
              <span>{isNl ? '2. untag Opgeschoonde Bounce' : '2. untag Cleaned Bounce'}</span>
            </button>
          </div>

          <div className="showcase-body">
            {activeTab === 'dirty' ? (
              <div className="showcase-pane">
                <div className="pane-header dirty-header">
                  <div className="pane-title">
                    <FileAudio2 size={18} />
                    <span>Neon_Dreams_v2_generation_raw.mp3</span>
                  </div>
                  <span className="pane-tag status-danger">
                    {isNl ? '3 Verborgen AI-tags gedetecteerd' : '3 Hidden AI tags detected'}
                  </span>
                </div>

                <div className="tag-table">
                  <div className="tag-row row-danger">
                    <div className="tag-id"><code>COMM</code></div>
                    <div className="tag-label">Comment</div>
                    <div className="tag-value">
                      Made with Suno 2026-10-03 id=c810d794-0e31-419b-a3d8-a68132e49755
                      <span className="tag-badge badge-danger">AI Watermark</span>
                    </div>
                  </div>

                  <div className="tag-row row-danger">
                    <div className="tag-id"><code>WOAS</code></div>
                    <div className="tag-label">Official audio source</div>
                    <div className="tag-value">
                      https://suno.com/song/c810d794-0e31-419b-a3d8-a68132e49755
                      <span className="tag-badge badge-warning">Verborgen bron-URL</span>
                    </div>
                  </div>

                  <div className="tag-row row-danger">
                    <div className="tag-id"><code>PRIV</code></div>
                    <div className="tag-label">Private data</div>
                    <div className="tag-value">
                      X-Algorithmic-Signature: 0x8F94A2B019E... (324 bytes)
                      <span className="tag-badge badge-danger">Tracking signature</span>
                    </div>
                  </div>

                  <div className="tag-row">
                    <div className="tag-id"><code>TIT2</code></div>
                    <div className="tag-label">Title</div>
                    <div className="tag-value">Neon Dreams [dirty raw]</div>
                  </div>

                  <div className="tag-row row-missing">
                    <div className="tag-id"><code>TBPM</code></div>
                    <div className="tag-label">BPM</div>
                    <div className="tag-value text-muted">
                      <em>{isNl ? 'Geen BPM aanwezig' : 'No BPM present'}</em>
                    </div>
                  </div>

                  <div className="tag-row row-missing">
                    <div className="tag-id"><code>TKEY</code></div>
                    <div className="tag-label">Initial Key</div>
                    <div className="tag-value text-muted">
                      <em>{isNl ? 'Geen toonsoort / Camelot aanwezig' : 'No key / Camelot present'}</em>
                    </div>
                  </div>
                </div>

                <div className="pane-footer">
                  <p className="footer-warning">
                    ⚠️ {isNl
                      ? 'Distributeurs (zoals DistroKid, TuneCore) en DJ-software kunnen deze AI-watermarks en interne generatie-IDs uitlezen.'
                      : 'Distributors (DistroKid, TuneCore) and DJ pools can detect these unstripped generation tags and internal IDs.'}
                  </p>
                  <button className="soft-button" onClick={() => setActiveTab('clean')}>
                    {isNl ? 'Bekijk het opgeschoonde resultaat →' : 'See cleaned output →'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="showcase-pane">
                <div className="pane-header clean-header">
                  <div className="pane-title">
                    <FileAudio2 size={18} className="text-mint" />
                    <span>Neon_Dreams_Master.mp3</span>
                  </div>
                  <span className="pane-tag status-success">
                    <Check size={13} />
                    {isNl ? '100% Schoon • Bit-perfect' : '100% Clean • Bit-perfect'}
                  </span>
                </div>

                <div className="tag-table">
                  <div className="tag-row row-success">
                    <div className="tag-id"><code>TBPM</code></div>
                    <div className="tag-label">BPM (Essentia.js)</div>
                    <div className="tag-value">
                      <b>124 BPM</b>
                      <span className="tag-badge badge-mint">Essentia.js WASM</span>
                    </div>
                  </div>

                  <div className="tag-row row-success">
                    <div className="tag-id"><code>TKEY</code></div>
                    <div className="tag-label">Initial Key</div>
                    <div className="tag-value">
                      <b>Am (8A)</b>
                      <span className="tag-badge badge-mint">Camelot Wheel</span>
                    </div>
                  </div>

                  <div className="tag-row">
                    <div className="tag-id"><code>TIT2</code></div>
                    <div className="tag-label">Title</div>
                    <div className="tag-value">Neon Dreams</div>
                  </div>

                  <div className="tag-row">
                    <div className="tag-id"><code>TPE1</code></div>
                    <div className="tag-label">Artist</div>
                    <div className="tag-value">Jamal Drenthe</div>
                  </div>

                  <div className="tag-row">
                    <div className="tag-id"><code>WOAS</code></div>
                    <div className="tag-label">Audio source URL</div>
                    <div className="tag-value">
                      https://www.jamaldrenthe.com
                      <span className="tag-badge badge-mint">{isNl ? 'Vervangen' : 'Replaced'}</span>
                    </div>
                  </div>

                  <div className="tag-row">
                    <div className="tag-id"><code>COMM</code></div>
                    <div className="tag-label">Comment</div>
                    <div className="tag-value">Produced by Jamal Drenthe</div>
                  </div>

                  <div className="tag-row">
                    <div className="tag-id"><code>TENC</code></div>
                    <div className="tag-label">Encoded by</div>
                    <div className="tag-value">Jamal Drenthe Clean</div>
                  </div>
                </div>

                <div className="pane-footer">
                  <p className="footer-success">
                    ✓ {isNl
                      ? 'Alle Suno-tags, PRIV signatures en tracking metadata zijn verwijderd. De audiodata is exact bit-voor-bit identiek gebleven.'
                      : 'All Suno tags, PRIV signatures, and tracking URLs have been eliminated. Audio streams remain 100% bit-for-bit intact.'}
                  </p>
                  <button className="primary-button" onClick={onOpenApp}>
                    <Zap size={15} />
                    <span>{isNl ? 'Probeer dit met je eigen track' : 'Try this on your own track'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Feature Bento Grid ── */}
      <section id="features" className="landing-section">
        <div className="section-head text-center">
          <span className="section-kicker">{isNl ? 'KRACHTIGE FEATURES' : 'CORE CAPABILITIES'}</span>
          <h2>
            {isNl ? 'Waarom producers en creators untag kiezen' : 'Why producers and creators choose untag'}
          </h2>
          <p>
            {isNl
              ? 'Gebouwd voor de hoogste audio-integriteit, zonder server-afhankelijkheid en zonder concessies.'
              : 'Engineered for absolute audio integrity, zero server dependencies, and zero compromises.'}
          </p>
        </div>

        <div className="bento-grid">
          {/* Card 1: Zero Re-encoding (Large) */}
          <div className="bento-card col-span-2">
            <div className="card-icon-wrap">
              <AudioLines size={24} className="text-mint" />
            </div>
            <h3>{isNl ? 'Zero Re-encoding: 1:1 Bit-Perfect Audio' : 'Zero Re-encoding: 1:1 Bit-Perfect Audio'}</h3>
            <p>
              {isNl
                ? 'Conventionele audiosoftware decodeert het geluid en codeert het opnieuw bij het opslaan, wat leidt tot verlies van transiënten, compressie-artefacten en kwaliteitsvermindering. untag raakt het audiosignaal nooit aan; alleen de ID3v2.4 en RIFF header-containers worden direct in bytes herschreven.'
                : 'Most converters decode and re-encode the audio stream on export, causing transient loss and generational compression artifacts. untag leaves the audio payload untouched, reconstructing only the ID3v2.4 and RIFF chunk headers in pure bytes.'}
            </p>
            <div className="card-badge-row">
              <span className="feature-pill">MP3 Layer-3</span>
              <span className="feature-pill">Broadcast WAV</span>
              <span className="feature-pill">PCM Float / 16-32 bit</span>
              <span className="feature-pill">0% Degradatie</span>
            </div>
          </div>

          {/* Card 2: Essentia.js WASM */}
          <div className="bento-card">
            <div className="card-icon-wrap">
              <Cpu size={24} className="text-mint" />
            </div>
            <h3>{isNl ? 'Essentia.js WASM Intelligence' : 'Essentia.js WASM Intelligence'}</h3>
            <p>
              {isNl
                ? 'Aangedreven door de befaamde C++ bibliotheek van MTG (Music Technology Group). Detecteert realtime BPM, toonsoort en dansbaarheid direct in een Web Worker.'
                : 'Powered by MTG’s industry-standard C++ audio library running in WebAssembly. Real-time BPM, harmonic key, and danceability detection right inside your browser.'}
            </p>
            <div className="card-badge-row">
              <span className="feature-pill">Camelot Wheel</span>
              <span className="feature-pill">RhythmExtractor2013</span>
              <span className="feature-pill">EDMA Key Profile</span>
            </div>
          </div>

          {/* Card 3: 100% Client-Side Privacy */}
          <div className="bento-card">
            <div className="card-icon-wrap">
              <Lock size={24} className="text-mint" />
            </div>
            <h3>{isNl ? '100% Zero-Knowledge Privacy' : '100% Zero-Knowledge Privacy'}</h3>
            <p>
              {isNl
                ? 'Onuitgebrachte demo’s en exclusieve masters verlaten nooit je apparaat. Geen uploads naar servers, geen tijdelijke cloudopslag, geen training op jouw audio.'
                : 'Unreleased demos and master stems never leave your local machine. No server uploads, no cloud retention, no algorithmic training on your music.'}
            </p>
            <div className="card-badge-row">
              <span className="feature-pill">Client-side only</span>
              <span className="feature-pill">Offline support</span>
              <span className="feature-pill">In-Memory Sandbox</span>
            </div>
          </div>

          {/* Card 4: WOAS & Source URL Sanitizer */}
          <div className="bento-card">
            <div className="card-icon-wrap">
              <Radio size={24} className="text-mint" />
            </div>
            <h3>{isNl ? 'WOAS & Bron-URL Sanitizer' : 'WOAS & Source URL Sanitizer'}</h3>
            <p>
              {isNl
                ? 'AI-tools schrijven verborgen `WOAS`-frames met de generatielink van hun server. untag herkent dit direct en overschrijft het met jouw eigen artiesten-URL.'
                : 'AI platforms inject hidden `WOAS` frames pointing to their internal generation URLs. untag surfaces this and replaces it cleanly with your own release URL.'}
            </p>
            <div className="card-badge-row">
              <span className="feature-pill">WOAS / WOAR</span>
              <span className="feature-pill">COMM Made with Suno</span>
              <span className="feature-pill">APEv2 & Lyrics3</span>
            </div>
          </div>

          {/* Card 5: Batch Processing & ZIP Export */}
          <div className="bento-card col-span-2">
            <div className="card-icon-wrap">
              <FolderArchive size={24} className="text-mint" />
            </div>
            <h3>{isNl ? 'Batchverwerking & 1-Klik ZIP Bounce' : 'Batch Processing & 1-Click ZIP Bounce'}</h3>
            <p>
              {isNl
                ? 'Sleep tientallen tracks tegelijk naar het venster. Pas gedeelde album- of producerinformatie met één klik toe op de hele batch en download alle gereinigde bestanden gebundeld in een handig ZIP-bestand.'
                : 'Drop entire albums or 20+ files at once. Apply shared metadata across every file with one button and download the entire cleaned session as a high-speed ZIP archive.'}
            </p>
            <div className="card-badge-row">
              <span className="feature-pill">Multi-file drag</span>
              <span className="feature-pill">Shared Tag Sync</span>
              <span className="feature-pill">fflate ZIP Engine</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works (3 Steps) ── */}
      <section id="how-it-works" className="landing-section">
        <div className="section-head text-center">
          <span className="section-kicker">{isNl ? 'WERKWIJZE' : 'WORKFLOW'}</span>
          <h2>{isNl ? 'In 3 eenvoudige stappen' : 'In 3 simple steps'}</h2>
          <p>
            {isNl
              ? 'Geen ingewikkelde instellingen of zware desktopsoftware nodig.'
              : 'No complicated configurations or bloated desktop installations.'}
          </p>
        </div>

        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">01</div>
            <h3>{isNl ? 'Drop je audio' : 'Drop your audio'}</h3>
            <p>
              {isNl
                ? 'Sleep één of meerdere MP3- of WAV-bestanden direct in de browser. untag leest de headercontainers razendsnel in.'
                : 'Drag and drop single or multiple MP3 or WAV files into the browser. untag parses container headers in milliseconds.'}
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">02</div>
            <h3>{isNl ? 'Inspecteer & Analyseer' : 'Inspect & Analyze'}</h3>
            <p>
              {isNl
                ? 'Zie direct welke verborgen AI-watermarks en bronlinks aanwezig zijn. Essentia.js WASM analyseert binnen 1s automatisch de BPM en toonsoort.'
                : 'Instantly view all embedded AI watermarks and source links. Essentia.js WASM calculates exact BPM and musical key within 1 second.'}
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">03</div>
            <h3>{isNl ? 'Bounce schone masters' : 'Bounce clean masters'}</h3>
            <p>
              {isNl
                ? 'Klik op opschonen. Alle trackingtags zijn verdwenen en je schone bestanden zijn direct klaar voor streaming, DJ-pools of archief.'
                : 'Click clean. All tracking watermarks vanish, leaving your pristine audio ready for Spotify, Beatport, or your private catalog.'}
            </p>
          </div>
        </div>

        <div className="text-center mt-12">
          <button className="landing-primary-btn" onClick={onOpenApp}>
            <Zap size={17} />
            <span>{isNl ? 'Probeer het nu in de Webapp' : 'Try it now in the Webapp'}</span>
            <ArrowRight size={17} />
          </button>
        </div>
      </section>

      {/* ── Essentia.js WASM Deep Dive ── */}
      <section id="engine" className="landing-section engine-section">
        <div className="engine-grid">
          <div className="engine-copy">
            <span className="section-kicker">
              {isNl ? 'GEAVANCEERDE AUDIOTECHNOLOGIE' : 'ADVANCED AUDIO TECH'}
            </span>
            <h2>
              {isNl
                ? 'Essentia.js C++ WebAssembly Engine'
                : 'Essentia.js C++ WebAssembly Engine'}
            </h2>
            <p>
              {isNl
                ? 'untag integreert Essentia.js — de toonaangevende open source C++ audio-analyzebibliotheek ontwikkeld door de Music Technology Group (Universitat Pompeu Fabra, Barcelona).'
                : 'untag embeds Essentia.js — the premier open-source C++ library for audio analysis developed by the Music Technology Group (Universitat Pompeu Fabra, Barcelona).'}
            </p>

            <div className="engine-points">
              <div className="engine-point">
                <div className="point-icon"><Check size={16} /></div>
                <div>
                  <h4>{isNl ? 'Multi-feature Beat Tracking' : 'Multi-feature Beat Tracking'}</h4>
                  <p>
                    {isNl
                      ? 'RhythmExtractor2013 analyseert tempo over een slim venster en filtert stille introducties automatisch uit.'
                      : 'RhythmExtractor2013 computes precise tempo over active track segments, ignoring ambient intros.'}
                  </p>
                </div>
              </div>

              <div className="engine-point">
                <div className="point-icon"><Check size={16} /></div>
                <div>
                  <h4>{isNl ? 'EDMA Harmonische Toonsoort & Camelot' : 'EDMA Harmonic Key & Camelot'}</h4>
                  <p>
                    {isNl
                      ? 'Nauwkeurige HPCP chromagrammen mappen automatisch naar het Camelot-wiel (bijv. 8A / Am) voor harmonisch mixen.'
                      : 'High-resolution HPCP chromagrams mapped directly to standard keys and Camelot notations (e.g. 8A / Am).'}
                  </p>
                </div>
              </div>

              <div className="engine-point">
                <div className="point-icon"><Check size={16} /></div>
                <div>
                  <h4>{isNl ? 'Dedicated Web Worker Threads' : 'Dedicated Web Worker Threads'}</h4>
                  <p>
                    {isNl
                      ? 'De analyse draait in afzonderlijke achtergrond-threads met zero-copy buffer transfers. Je interface blijft 100% vloeiend en responsief.'
                      : 'Calculations run in dedicated background threads with zero-copy transferable memory so your browser never freezes.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="engine-graphic">
            <div className="wasm-card">
              <div className="wasm-card-top">
                <div className="wasm-status-dot" />
                <span className="wasm-card-title">Essentia.js Worker Thread (WASM)</span>
              </div>
              <div className="wasm-metrics">
                <div className="metric-box">
                  <span className="metric-label">DETECTED TEMPO</span>
                  <span className="metric-value">124 <small>BPM</small></span>
                  <span className="metric-sub">Confidence: 98%</span>
                </div>
                <div className="metric-box">
                  <span className="metric-label">CAMELOT KEY</span>
                  <span className="metric-value">8A <small>(Am)</small></span>
                  <span className="metric-sub">Profile: EDMA</span>
                </div>
                <div className="metric-box">
                  <span className="metric-label">DANCEABILITY</span>
                  <span className="metric-value">84%</span>
                  <span className="metric-sub">Groove Index: High</span>
                </div>
                <div className="metric-box">
                  <span className="metric-label">ZERO-COPY TRANSFER</span>
                  <span className="metric-value">0.12 <small>sec</small></span>
                  <span className="metric-sub">Float32 Transferable</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Comparison Table ── */}
      <section id="comparison" className="landing-section">
        <div className="section-head text-center">
          <span className="section-kicker">{isNl ? 'WAAROM UNTAG' : 'WHY UNTAG'}</span>
          <h2>
            {isNl ? 'Vergelijk untag met traditionele tools' : 'Compare untag with legacy software'}
          </h2>
          <p>
            {isNl
              ? 'Zie in één oogopslag waarom untag speciaal is ontworpen voor moderne muziekproducers.'
              : 'See at a glance why untag is tailored specifically for modern producers and hybrid music workflows.'}
          </p>
        </div>

        <div className="table-responsive">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>{isNl ? 'Functionaliteit' : 'Feature'}</th>
                <th className="highlight-col">untag.</th>
                <th>{isNl ? 'Desktop Taggers (bijv. Mp3tag)' : 'Desktop Taggers (e.g. Mp3tag)'}</th>
                <th>{isNl ? 'Online Web Converters' : 'Online Web Converters'}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>{isNl ? 'Zero Re-encoding (Bit-perfect behoud)' : 'Zero Re-encoding (Bit-perfect)'}</strong></td>
                <td className="highlight-col"><Check size={16} className="text-mint mx-auto" /></td>
                <td><Check size={16} className="text-mint mx-auto" /></td>
                <td className="text-danger">✗ {isNl ? 'Vaak gehercomprimeerd' : 'Often re-compressed'}</td>
              </tr>
              <tr>
                <td><strong>{isNl ? '100% Client-Side Privacy (Geen uploads)' : '100% Client-Side (No server uploads)'}</strong></td>
                <td className="highlight-col"><Check size={16} className="text-mint mx-auto" /></td>
                <td><Check size={16} className="text-mint mx-auto" /></td>
                <td className="text-danger">✗ {isNl ? 'Tracks naar cloud server' : 'Tracks sent to cloud'}</td>
              </tr>
              <tr>
                <td><strong>{isNl ? 'AI Watermark Detectie (Suno/Udio)' : 'AI Watermark Detection (Suno/Udio)'}</strong></td>
                <td className="highlight-col"><Check size={16} className="text-mint mx-auto" /></td>
                <td className="text-muted">✗ {isNl ? 'Handmatig zoeken' : 'Manual search'}</td>
                <td className="text-danger">✗</td>
              </tr>
              <tr>
                <td><strong>{isNl ? 'Realtime BPM & Camelot Key (Essentia WASM)' : 'Realtime BPM & Camelot Key (Essentia WASM)'}</strong></td>
                <td className="highlight-col"><Check size={16} className="text-mint mx-auto" /></td>
                <td className="text-muted">✗ {isNl ? 'Niet geïntegreerd' : 'Not integrated'}</td>
                <td className="text-danger">✗</td>
              </tr>
              <tr>
                <td><strong>{isNl ? 'WOAS & Bron-URL Sanitize' : 'WOAS & Source URL Sanitizer'}</strong></td>
                <td className="highlight-col"><Check size={16} className="text-mint mx-auto" /></td>
                <td className="text-muted">✗ {isNl ? 'Complexe instellingen' : 'Complex manual edits'}</td>
                <td className="text-danger">✗</td>
              </tr>
              <tr>
                <td><strong>{isNl ? 'Direct in browser (Geen installatie)' : 'Instant in browser (Zero install)'}</strong></td>
                <td className="highlight-col"><Check size={16} className="text-mint mx-auto" /></td>
                <td className="text-muted">✗ {isNl ? 'Software installeren' : 'Requires install'}</td>
                <td><Check size={16} className="text-mint mx-auto" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Interactive FAQ Accordion ── */}
      <section id="faq" className="landing-section">
        <div className="section-head text-center">
          <span className="section-kicker">FAQ</span>
          <h2>{isNl ? 'Veelgestelde vragen' : 'Frequently Asked Questions'}</h2>
          <p>
            {isNl
              ? 'Alles wat je moet weten over metadata, audio-integriteit en privacy.'
              : 'Everything you need to know regarding audio containers, integrity, and privacy.'}
          </p>
        </div>

        <div className="faq-list">
          {[
            {
              q: isNl
                ? 'Blijft de audiokwaliteit van mijn bestanden echt 100% identiek?'
                : 'Does the audio quality remain 100% bit-for-bit identical?',
              a: isNl
                ? 'Ja, absoluut. untag decodert en re-encodeert de audio streams nóóit. Bij MP3 worden de pure MPEG audioframes uitgelezen en samengevoegd met een schone ID3v2.4 header. Bij WAV worden alleen de RIFF header- en LIST-INFO chunks aangepast, terwijl de data-chunk exact op de byte gelijk blijft.'
                : 'Yes, completely. untag never decompresses or re-encodes your audio frames. For MP3 files, the raw MPEG frames are isolated and combined with a clean ID3v2.4 header. For WAV files, only the RIFF chunks are replaced while the data chunk remains byte-for-byte identical.',
            },
            {
              q: isNl
                ? 'Waarom is het verwijderen van AI-watermarks (Suno/Udio) belangrijk?'
                : 'Why is removing AI watermarks and source tags so important?',
              a: isNl
                ? 'AI-muziekgeneratoren voegen verborgen tags toe in ID3-frames zoals COMM ("Made with Suno"), WOAS (URL naar de online generatie) en PRIV bytes. Muziekdistributeurs, streamingdiensten en DJ-pools scannen deze tags automatisch. Met untag verwijder je deze claims en vervang je ze door je eigen artiesten- en auteursrechten.'
                : 'Generative AI tools embed proprietary metadata in frames like COMM ("Made with Suno"), WOAS (the internal generation link), and PRIV blocks. Distributors, streaming platforms, and DJ pools can automatically flag these files. untag purges these markers and stamps your own artist identity.',
            },
            {
              q: isNl
                ? 'Worden mijn audiobestanden ergens opgeslagen of geüpload?'
                : 'Are my audio files ever uploaded or stored on any server?',
              a: isNl
                ? 'Nee. De kern van untag draait 100% lokaal in je browser via HTML5 File API, Web Workers en WebAssembly. Zelfs als je je internetverbinding verbreekt, blijft de volledige webapp lokaal functioneren.'
                : 'No. untag runs 100% locally in your browser using HTML5 File APIs, Web Workers, and WebAssembly. Your audio files never touch a cloud server and the tool functions entirely offline in memory.',
            },
            {
              q: isNl
                ? 'Hoe werkt de automatische BPM- en toonsoortdetectie?'
                : 'How does the automatic BPM and Key detection work?',
              a: isNl
                ? 'untag maakt gebruik van Essentia.js, een C++ bibliotheek gecompileerd naar WebAssembly. Het berekent automatisch de exacte BPM via een multi-feature ritme-extractor en analyseert de toonsoort via HPCP-chromagrammen (gemapt naar het Camelot-wiel, bijv. 8A / Am).'
                : 'untag integrates Essentia.js compiled to WebAssembly. It detects exact tempo via multi-feature beat-tracking algorithms and maps harmonic keys directly to standard musical notation and the Camelot wheel (e.g. 8A / Am).',
            },
            {
              q: isNl
                ? 'Welke formaten worden ondersteund?'
                : 'Which audio formats are supported?',
              a: isNl
                ? 'untag ondersteunt MP3 (MPEG-1/2 Audio Layer III met ID3v2.3, ID3v2.4 en ID3v1) en WAV (RIFF/WAVE PCM en IEEE Float tot 32-bit). Bestanden tot 100 MB per stuk worden soepel verwerkt.'
                : 'untag supports MP3 (MPEG-1/2 Audio Layer III with ID3v2.3, ID3v2.4, ID3v1) and WAV (RIFF/WAVE PCM and IEEE Float up to 32-bit), up to 100 MB per file.',
            },
          ].map((item, idx) => (
            <div key={idx} className={`faq-item ${openFaq === idx ? 'is-open' : ''}`}>
              <button
                className="faq-question"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              >
                <span>{item.q}</span>
                <ChevronDown size={18} className="faq-chevron" />
              </button>
              {openFaq === idx && (
                <div className="faq-answer">
                  <p>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Big Call To Action Banner ── */}
      <section className="landing-cta-banner">
        <div className="cta-banner-content">
          <div className="banner-badge">
            <Sparkles size={14} />
            <span>{isNl ? 'Direct klaar voor gebruik' : 'Ready to use now'}</span>
          </div>
          <h2>
            {isNl
              ? 'Klaar om je masters professioneel op te schonen?'
              : 'Ready to professionally clean your masters?'}
          </h2>
          <p>
            {isNl
              ? 'Geen registratie verplicht. Sleep je bestanden en ervaar direct het verschil in de studio webapp.'
              : 'No mandatory registration. Drop your tracks and experience the difference immediately in the studio webapp.'}
          </p>
          <div className="banner-actions">
            <button className="landing-primary-btn" onClick={onOpenApp}>
              <Zap size={18} />
              <span>{isNl ? 'Open de untag Webapp' : 'Open untag Studio Webapp'}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="footer-top">
          <div className="footer-brand-block">
            <a href="#hero" className="brand">
              <img src={logo} className="brand-mark" alt="JD" />
              <span className="brand-word">
                untag<span className="brand-period">.</span>
              </span>
            </a>
            <p className="footer-tagline">
              {isNl
                ? 'Bit-perfect audio metadata sanitizer & audio intelligence.'
                : 'Bit-perfect audio metadata sanitizer & audio intelligence.'}
            </p>
          </div>

          <div className="footer-nav-col">
            <h4>{isNl ? 'Navigatie' : 'Navigation'}</h4>
            <a href="#features">{isNl ? 'Mogelijkheden' : 'Features'}</a>
            <a href="#showcase">{isNl ? 'Voor & Na Demo' : 'Before & After'}</a>
            <a href="#engine">Essentia.js WASM</a>
            <a href="#faq">FAQ</a>
            <button className="footer-link-btn" onClick={onOpenApp}>
              {isNl ? 'Studio Webapp' : 'Studio Webapp'}
            </button>
          </div>

          <div className="footer-nav-col">
            <h4>Jamal Drenthe</h4>
            <a href="https://www.jamaldrenthe.com" target="_blank" rel="noreferrer">
              jamaldrenthe.com
            </a>
            <a href="https://github.com/JamalDrenthe/untag" target="_blank" rel="noreferrer">
              GitHub Repository
            </a>
            <span className="footer-badge">
              <ShieldCheck size={12} />
              {isNl ? '100% Veilig & Lokaal' : '100% Safe & Local'}
            </span>
          </div>
        </div>

        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} Jamal Drenthe. {isNl ? 'Alle rechten voorbehouden.' : 'All rights reserved.'}
          </p>
          <p className="footer-privacy-note">
            <span className="privacy-dot" />
            {isNl
              ? 'Bestanden worden uitsluitend in je browsergeheugen verwerkt en nooit opgeslagen.'
              : 'Files are processed in memory and never stored on any external server.'}
          </p>
        </div>
      </footer>
    </div>
  )
}
