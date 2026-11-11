import type {
  AudioFormat,
  AudioInfo,
  Inspection,
  MetadataContainer,
  MetadataItem,
  Profile,
  TagSet,
} from './types'

export * from './types'

const textDecoder = new TextDecoder()
const latinDecoder = new TextDecoder('windows-1252')

const FRAME_LABELS: Record<string, string> = {
  TIT1: 'Content group',
  TT1: 'Content group',
  TIT2: 'Title',
  TT2: 'Title',
  TIT3: 'Subtitle',
  TT3: 'Subtitle',
  TPE1: 'Artist',
  TP1: 'Artist',
  TPE2: 'Album artist',
  TP2: 'Album artist',
  TPE3: 'Conductor',
  TP3: 'Conductor',
  TPE4: 'Remixer',
  TP4: 'Remixer',
  TCOM: 'Composer',
  TCM: 'Composer',
  TEXT: 'Lyricist',
  TXT: 'Lyricist',
  TOPE: 'Original artist',
  TOA: 'Original artist',
  TALB: 'Album',
  TAL: 'Album',
  TRCK: 'Track number',
  TRK: 'Track number',
  TPOS: 'Disc number',
  TPA: 'Disc number',
  TCMP: 'Compilation',
  TDRC: 'Recording date',
  TDOR: 'Original release date',
  TDRL: 'Release date',
  TYER: 'Year',
  TYE: 'Year',
  TCON: 'Genre',
  TCO: 'Genre',
  TBPM: 'BPM',
  TBP: 'BPM',
  TKEY: 'Initial key',
  TKE: 'Initial key',
  TMOO: 'Mood',
  TSOT: 'Title sort',
  TSOP: 'Artist sort',
  TSOA: 'Album sort',
  TSOC: 'Composer sort',
  TLAN: 'Language',
  TMED: 'Media type',
  TSRC: 'ISRC',
  TPUB: 'Publisher',
  TPB: 'Publisher',
  TCOP: 'Copyright',
  TCR: 'Copyright',
  TPRO: 'Producer rights',
  TENC: 'Encoded by',
  TEN: 'Encoded by',
  COMM: 'Comment',
  COM: 'Comment',
  USLT: 'Lyrics',
  ULT: 'Lyrics',
  WOAR: 'Official artist website',
  APIC: 'Attached picture',
  PRIV: 'Private data',
  GEOB: 'General encapsulated object',
  UFID: 'Unique file identifier',
  POPM: 'Popularimeter',
  PCNT: 'Play counter',
  TXXX: 'User-defined text',
  WXXX: 'User-defined URL',
  TXX: 'User-defined text',
  WXX: 'User-defined URL',
  PIC: 'Attached picture',
  GEO: 'General encapsulated object',
  UFI: 'Unique file identifier',
  POP: 'Popularimeter',
  CNT: 'Play counter',
}


const WRITE_FRAME_MAP: Array<[keyof TagSet, string]> = [
  ['grouping', 'TIT1'], ['title', 'TIT2'], ['subtitle', 'TIT3'], ['artist', 'TPE1'],
  ['album_artist', 'TPE2'], ['conductor', 'TPE3'], ['remixer', 'TPE4'], ['composer', 'TCOM'],
  ['lyricist', 'TEXT'], ['original_artist', 'TOPE'], ['album', 'TALB'], ['track', 'TRCK'],
  ['disc', 'TPOS'], ['compilation', 'TCMP'], ['date', 'TDRC'], ['originaldate', 'TDOR'],
  ['releasedate', 'TDRL'], ['genre', 'TCON'], ['bpm', 'TBPM'], ['initialkey', 'TKEY'],
  ['mood', 'TMOO'], ['title-sort', 'TSOT'], ['artist-sort', 'TSOP'], ['album-sort', 'TSOA'],
  ['composer-sort', 'TSOC'], ['language', 'TLAN'], ['media_type', 'TMED'], ['isrc', 'TSRC'],
  ['publisher', 'TPUB'], ['copyright', 'TCOP'], ['producer_rights', 'TPRO'], ['encoded_by', 'TENC'],
]

const INFO_LABELS: Record<string, string> = {
  INAM: 'Title',
  IART: 'Artist',
  IPRD: 'Album',
  ICRD: 'Date',
  IGNR: 'Genre',
  ICOP: 'Copyright',
  ICMT: 'Comment',
  ISFT: 'Encoded by',
  IENG: 'Engineer',
  ITRK: 'Track',
  IPRT: 'Part',
  IURL: 'URL',
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  let out = ''
  for (let i = start; i < Math.min(bytes.length, start + length); i += 1) out += String.fromCharCode(bytes[i])
  return out
}

function u32le(bytes: Uint8Array, at: number): number {
  return (bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24)) >>> 0
}

function u32be(bytes: Uint8Array, at: number): number {
  return ((bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]) >>> 0
}

function u24be(bytes: Uint8Array, at: number): number {
  return (bytes[at] << 16) | (bytes[at + 1] << 8) | bytes[at + 2]
}

function syncSafe(bytes: Uint8Array, at: number): number {
  return (bytes[at] << 21) | (bytes[at + 1] << 14) | (bytes[at + 2] << 7) | bytes[at + 3]
}

function deUnsync(bytes: Uint8Array): Uint8Array {
  const output = new Uint8Array(bytes.length)
  let write = 0
  for (let i = 0; i < bytes.length; i += 1) {
    output[write++] = bytes[i]
    if (bytes[i] === 0xff && bytes[i + 1] === 0x00) i += 1
  }
  return output.subarray(0, write)
}

function decoded(bytes: Uint8Array, encoding: number): string {
  if (encoding === 0) return latinDecoder.decode(bytes)
  if (encoding === 1) return new TextDecoder('utf-16').decode(bytes)
  if (encoding === 2) return new TextDecoder('utf-16be').decode(bytes)
  if (encoding === 3) return textDecoder.decode(bytes)
  return latinDecoder.decode(bytes)
}

function nullEnd(bytes: Uint8Array, start: number, encoding: number): number {
  if (encoding === 1 || encoding === 2) {
    for (let i = start; i + 1 < bytes.length; i += 2) {
      if (bytes[i] === 0 && bytes[i + 1] === 0) return i
    }
    return bytes.length
  }
  for (let i = start; i < bytes.length; i += 1) if (bytes[i] === 0) return i
  return bytes.length
}

function readEncodedString(bytes: Uint8Array, encoding: number, start = 0): { value: string; end: number } {
  const end = nullEnd(bytes, start, encoding)
  const next = encoding === 1 || encoding === 2 ? Math.min(bytes.length, end + 2) : Math.min(bytes.length, end + 1)
  return { value: decoded(bytes.subarray(start, end), encoding).replace(/\0+$/g, ''), end: next }
}

function cleanText(value: string): string {
  return value.replace(/\0/g, '').trim()
}

function decodeId3Frames(raw: Uint8Array, major: number, unsync: boolean, extendedHeader: boolean): MetadataItem[] {
  const body = raw
  let offset = 0
  if (extendedHeader && major === 3 && body.length >= 4) offset = 4 + u32be(body, 0)
  if (extendedHeader && major === 4 && body.length >= 4) offset = syncSafe(body, 0)
  const items: MetadataItem[] = []
  while (offset + (major === 2 ? 6 : 10) <= body.length) {
    const headerLength = major === 2 ? 6 : 10
    const idLength = major === 2 ? 3 : 4
    const id = ascii(body, offset, idLength)
    if (!/^[A-Z0-9]{3,4}$/.test(id) || /^\0+$/.test(id)) break
    const sizeAt = offset + idLength
    const size = major === 2 ? u24be(body, sizeAt) : major === 4 ? syncSafe(body, sizeAt) : u32be(body, sizeAt)
    if (!size || offset + headerLength + size > body.length) break
    const flags = major === 2 ? 0 : (body[offset + 8] << 8) | body[offset + 9]
    let data = body.subarray(offset + headerLength, offset + headerLength + size)
    if (unsync || (major === 4 && (flags & 0x0002))) data = deUnsync(data)
    if ((major === 3 && (flags & 0x00c0)) || (major === 4 && (flags & 0x000c))) {
      offset += headerLength + size
      continue
    }
    if ((major === 3 && (flags & 0x0020)) || (major === 4 && (flags & 0x0040))) data = data.subarray(1)
    if (major === 4 && (flags & 0x0001)) data = data.subarray(4)
    const item = decodeFrame(id, data)
    if (item) items.push({ ...item, container: 'ID3v2.x' })
    offset += headerLength + size
  }
  return items
}

function decodeFrame(id: string, data: Uint8Array): Omit<MetadataItem, 'container'> | null {
  const label = FRAME_LABELS[id] ?? id
  if (id.startsWith('T') && id !== 'TXXX' && id !== 'TXX') {
    const value = data.length ? cleanText(decoded(data.subarray(1), data[0])) : ''
    return { id, label, value: value || `<${data.length} bytes>` }
  }
  if (id === 'COMM' || id === 'COM' || id === 'USLT' || id === 'ULT') {
    if (data.length < 4) return { id, label, value: `<${data.length} bytes>` }
    const encoding = data[0]
    const language = ascii(data, 1, 3)
    const description = readEncodedString(data, encoding, 4)
    const value = cleanText(decoded(data.subarray(description.end), encoding))
    return { id, label, value: `${language}${description.value ? ` | ${description.value}` : ''}: ${value}` }
  }
  if (id === 'TXXX' || id === 'TXX') {
    if (!data.length) return { id, label, value: '<0 bytes>' }
    const desc = readEncodedString(data, data[0], 1)
    return { id, label: desc.value || label, value: cleanText(decoded(data.subarray(desc.end), data[0])) }
  }
  if (id === 'WXXX' || id === 'WXX') {
    if (!data.length) return { id, label, value: '<0 bytes>' }
    const desc = readEncodedString(data, data[0], 1)
    return { id, label: desc.value || label, value: latinDecoder.decode(data.subarray(desc.end)).replace(/\0/g, '') }
  }
  if (id.startsWith('W')) return { id, label, value: latinDecoder.decode(data).replace(/\0/g, '') }
  if ((id === 'APIC' || id === 'PIC') && data.length >= (id === 'APIC' ? 4 : 6)) {
    const mimeEnd = id === 'APIC' ? data.indexOf(0, 1) : 4
    if (mimeEnd < 0) return { id, label, value: `<${data.length} bytes>` }
    const mime = id === 'APIC'
      ? ascii(data, 1, mimeEnd - 1) || 'image/unknown'
      : ascii(data, 1, 3).toUpperCase() === 'JPG' ? 'image/jpeg' : `image/${ascii(data, 1, 3).toLowerCase()}`
    const typeAt = id === 'APIC' ? mimeEnd + 1 : 4
    const description = readEncodedString(data, data[typeAt] ?? 0, typeAt + 1)
    const size = data.length - description.end
    const pictureType = data[typeAt]
    const kind = pictureType === 3 ? 'front cover' : pictureType === 4 ? 'back cover' : `picture type ${pictureType}`
    return { id, label, value: `${mime} ${Math.max(1, Math.round(size / 1024))} KB, ${kind}` }
  }
  if (id === 'GEOB' || id === 'GEO') {
    if (data.length < 4) return { id, label, value: `<${data.length} bytes>` }
    const mimeEnd = data.indexOf(0, 1)
    if (mimeEnd < 0) return { id, label, value: `<${data.length} bytes>` }
    const mime = latinDecoder.decode(data.subarray(1, mimeEnd))
    const filename = readEncodedString(data, data[0], mimeEnd + 1)
    const description = readEncodedString(data, data[0], filename.end)
    return { id, label, value: `${mime}${filename.value ? ` | ${filename.value}` : ''} | ${data.length - description.end} bytes` }
  }
  if (id === 'PRIV' || id === 'UFID' || id === 'UFI') {
    const ownerEnd = data.indexOf(0)
    const owner = ownerEnd >= 0 ? latinDecoder.decode(data.subarray(0, ownerEnd)) : 'unknown owner'
    const payloadStart = ownerEnd >= 0 ? ownerEnd + 1 : 0
    return { id, label, value: `${owner} | ${data.length - payloadStart} bytes` }
  }
  if ((id === 'POPM' || id === 'POP') && data.length >= 2) {
    const end = data.indexOf(0)
    if (end < 0) return { id, label, value: `<${data.length} bytes>` }
    const email = latinDecoder.decode(data.subarray(0, end < 0 ? data.length : end))
    const ratingAt = end + 1
    const count = data.length > ratingAt + 1 ? decodeCounter(data.subarray(ratingAt + 1)) : '0'
    return { id, label, value: `${email} | rating ${data[ratingAt] ?? 0} | plays ${count}` }
  }
  if (id === 'PCNT' || id === 'CNT') return { id, label, value: decodeCounter(data) }
  return { id, label, value: `<${data.length} bytes>` }
}

function decodeCounter(bytes: Uint8Array): string {
  let value = 0n
  for (const byte of bytes) value = (value << 8n) | BigInt(byte)
  return value.toString()
}

function readId3Tag(bytes: Uint8Array, offset: number): { end: number; items: MetadataItem[] } | null {
  if (offset + 10 > bytes.length || ascii(bytes, offset, 3) !== 'ID3') return null
  const major = bytes[offset + 3]
  if (major < 2 || major > 4) return null
  const size = syncSafe(bytes, offset + 6)
  let end = offset + 10 + size
  if (end > bytes.length) return null
  if (major === 4 && (bytes[offset + 5] & 0x10) && ascii(bytes, end, 3) === '3DI') end += 10
  const body = bytes.subarray(offset + 10, offset + 10 + size)
  const flags = bytes[offset + 5]
  return { end, items: decodeId3Frames(body, major, Boolean(flags & 0x80), Boolean(flags & 0x40)) }
}

function scanLeadingId3(bytes: Uint8Array): { audioStart: number; items: MetadataItem[] } {
  let cursor = 0
  const items: MetadataItem[] = []
  while (ascii(bytes, cursor, 3) === 'ID3') {
    const tag = readId3Tag(bytes, cursor)
    if (!tag) break
    cursor = tag.end
    items.push(...tag.items)
  }
  return { audioStart: cursor, items }
}

function inspectId3Chunk(bytes: Uint8Array): MetadataItem[] {
  const result: MetadataItem[] = []
  let offset = 0
  while (offset + 10 <= bytes.length) {
    const tag = readId3Tag(bytes, offset)
    if (!tag) break
    result.push(...tag.items.map((item) => ({ ...item, container: 'RIFF id3 chunk' as const })))
    offset = tag.end
  }
  return result
}

function parseApeAt(bytes: Uint8Array, end: number): { items: MetadataItem[]; start: number } | undefined {
  const footer = end - 32
  if (footer < 0 || ascii(bytes, footer, 8) !== 'APETAGEX') return undefined
  const size = u32le(bytes, footer + 12)
  if (size < 32 || size > end) return undefined
  const count = u32le(bytes, footer + 16)
  const start = end - size
  const items: MetadataItem[] = []
  let offset = start
  for (let n = 0; n < Math.min(count, 1000) && offset + 8 <= footer; n += 1) {
    const valueSize = u32le(bytes, offset)
    offset += 8
    let keyEnd = offset
    while (keyEnd < footer && bytes[keyEnd] !== 0) keyEnd += 1
    if (keyEnd === footer) break
    const key = latinDecoder.decode(bytes.subarray(offset, keyEnd))
    offset = keyEnd + 1
    if (offset + valueSize > footer) break
    const valueBytes = bytes.subarray(offset, offset + valueSize)
    const flags = u32le(bytes, offset - key.length - 5)
    const type = (flags >>> 1) & 3
    const value = type === 0 ? cleanText(latinDecoder.decode(valueBytes)) : `<${valueSize} bytes>`
    items.push({ container: 'APEv2', id: key, label: key, value })
    offset += valueSize
  }
  return { items, start }
}

function parseId3v1At(bytes: Uint8Array, end: number): MetadataItem[] {
  const offset = end - 128
  if (offset < 0 || ascii(bytes, offset, 3) !== 'TAG') return []
  const fields: Array<[string, string, number, number]> = [
    ['TIT2', 'Title', 3, 30],
    ['TPE1', 'Artist', 33, 30],
    ['TALB', 'Album', 63, 30],
    ['TYER', 'Year', 93, 4],
    ['COMM', 'Comment', 97, 30],
    ['TCON', 'Genre', 127, 1],
  ]
  return fields.map(([id, label, start, length]): MetadataItem => ({
    container: 'ID3v1',
    id,
    label,
    value: cleanText(latinDecoder.decode(bytes.subarray(offset + start, offset + start + length))),
  })).filter(({ value }) => value.length > 0)
}

function parseLyrics3At(bytes: Uint8Array, end: number): { items: MetadataItem[]; start: number } | undefined {
  const footer = end - 9
  if (footer < 0 || ascii(bytes, footer, 9) !== 'LYRICS200') return undefined
  const sizeText = ascii(bytes, footer - 6, 6)
  if (!/^\d{6}$/.test(sizeText)) return undefined
  const contentStart = footer - 6 - Number(sizeText)
  const start = contentStart - 11
  if (start < 0 || ascii(bytes, start, 11) !== 'LYRICSBEGIN') return undefined
  const content = latinDecoder.decode(bytes.subarray(contentStart, footer - 6))
  return { items: [{ container: 'Lyrics3', id: 'LYR', label: 'Lyrics3 lyrics', value: content || `<${Number(sizeText)} bytes>` }], start }
}

function parseTailMetadata(bytes: Uint8Array): MetadataItem[] {
  const items: MetadataItem[] = []
  let end = bytes.length
  while (end > 0) {
    const id3v1Items = parseId3v1At(bytes, end)
    if (id3v1Items.length || (end >= 128 && ascii(bytes, end - 128, 3) === 'TAG')) {
      items.push(...id3v1Items)
      end -= 128
      continue
    }
    const ape = parseApeAt(bytes, end)
    if (ape) {
      items.push(...ape.items)
      end = ascii(bytes, ape.start - 32, 8) === 'APETAGEX' ? ape.start - 32 : ape.start
      continue
    }
    const lyrics = parseLyrics3At(bytes, end)
    if (lyrics) {
      items.push(...lyrics.items)
      end = lyrics.start
      continue
    }
    break
  }
  return items
}

function sunoHint(items: MetadataItem[]): Inspection['suno'] {
  const comment = items.find(({ id, value }) =>
    ['COMM', 'COM', 'ICMT', 'comment'].includes(id) && /made with suno/i.test(value),
  )?.value
  if (!comment) return undefined
  const created = comment.match(/created=([0-9]{4}-[0-9]{2}-[0-9]{2})/i)?.[1]
  const id = comment.match(/\bid=([0-9a-f-]{20,})/i)?.[1]
  return { ...(created ? { created } : {}), ...(id ? { id } : {}) }
}

function mp3AudioInfo(bytes: Uint8Array, audioStart: number): { audio: AudioInfo; duration?: number } {
  const rates = [44100, 48000, 32000]
  const mpeg1Layer1 = [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448]
  const mpeg1Layer2 = [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384]
  const mpeg1Layer3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
  const mpeg2Layer1 = [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256]
  const mpeg2Layer23 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
  const limit = Math.min(bytes.length - 4, audioStart + 64 * 1024)
  for (let i = audioStart; i < limit; i += 1) {
    if (bytes[i] !== 0xff || (bytes[i + 1] & 0xe0) !== 0xe0) continue
    const version = (bytes[i + 1] >> 3) & 3
    const layer = (bytes[i + 1] >> 1) & 3
    const bitrateIndex = bytes[i + 2] >> 4
    const rateIndex = (bytes[i + 2] >> 2) & 3
    if (version === 1 || layer === 0 || bitrateIndex === 0 || bitrateIndex === 15 || rateIndex === 3) continue
    const sampleRate = rates[rateIndex] / (version === 3 ? 1 : version === 2 ? 2 : 4)
    const table = version === 3
      ? layer === 3 ? mpeg1Layer1 : layer === 2 ? mpeg1Layer2 : mpeg1Layer3
      : layer === 3 ? mpeg2Layer1 : mpeg2Layer23
    const bitrate = table[bitrateIndex] ?? 128
    const channels = ((bytes[i + 3] >> 6) & 3) === 3 ? 1 : 2
    const end = trailingAudioEnd(bytes)
    return { audio: { bitrate: bitrate * 1000, samplerate: sampleRate, channels }, duration: ((end - audioStart) * 8) / (bitrate * 1000) }
  }
  return { audio: {} }
}

function trailingAudioEnd(bytes: Uint8Array): number {
  let end = bytes.length
  let changed = true
  while (changed) {
    changed = false
    if (end >= 128 && ascii(bytes, end - 128, 3) === 'TAG') {
      end -= 128
      changed = true
      continue
    }
    if (end >= 32 && ascii(bytes, end - 32, 8) === 'APETAGEX') {
      const size = u32le(bytes, end - 20)
      const footerStart = end - 32
      let start = Math.max(0, end - size)
      if (ascii(bytes, start - 32, 8) === 'APETAGEX') start -= 32
      if (start < footerStart) {
        end = start
        changed = true
        continue
      }
    }
    if (end >= 9 && ascii(bytes, end - 9, 9) === 'LYRICS200') {
      const size = Number(ascii(bytes, end - 15, 6))
      if (Number.isFinite(size) && size >= 0 && ascii(bytes, end - 26 - size, 11) === 'LYRICSBEGIN') {
        end -= 15 + size + 11
        changed = true
      }
    }
  }
  return end
}

interface RiffChunk {
  id: string
  start: number
  size: number
  end: number
  paddedEnd: number
}

function riffChunks(bytes: Uint8Array): RiffChunk[] {
  const chunks: RiffChunk[] = []
  let offset = 12
  while (offset + 8 <= bytes.length) {
    const id = ascii(bytes, offset, 4)
    const size = u32le(bytes, offset + 4)
    const end = offset + 8 + size
    if (end > bytes.length) break
    chunks.push({ id, start: offset, size, end, paddedEnd: end + (size & 1) })
    offset = end + (size & 1)
  }
  return chunks
}

function parseInfoChunk(bytes: Uint8Array, chunk: RiffChunk): MetadataItem[] {
  if (chunk.size < 4 || ascii(bytes, chunk.start + 8, 4) !== 'INFO') return []
  const items: MetadataItem[] = []
  let offset = chunk.start + 12
  while (offset + 8 <= chunk.end) {
    const id = ascii(bytes, offset, 4)
    const size = u32le(bytes, offset + 4)
    const end = offset + 8 + size
    if (end > chunk.end) break
    const value = cleanText(latinDecoder.decode(bytes.subarray(offset + 8, end)))
    items.push({ container: 'RIFF LIST-INFO', id, label: INFO_LABELS[id] ?? id, value: value || `<${size} bytes>` })
    offset = end + (size & 1)
  }
  return items
}

function wavInfo(bytes: Uint8Array, chunks: RiffChunk[]): { audio: AudioInfo; duration?: number } {
  const fmt = chunks.find(({ id }) => id === 'fmt ')
  if (!fmt || fmt.size < 16) return { audio: {} }
  const codecId = u32le(bytes, fmt.start + 8) & 0xffff
  const channels = bytes[fmt.start + 10] | (bytes[fmt.start + 11] << 8)
  const samplerate = u32le(bytes, fmt.start + 12)
  const blockAlign = bytes[fmt.start + 20] | (bytes[fmt.start + 21] << 8)
  const bitsPerSample = bytes[fmt.start + 22] | (bytes[fmt.start + 23] << 8)
  const codec = codecId === 1 ? 'PCM' : codecId === 3 ? 'IEEE float' : `WAVE codec 0x${codecId.toString(16).padStart(4, '0')}`
  const dataSize = chunks.filter(({ id }) => id === 'data').reduce((sum, chunk) => sum + chunk.size, 0)
  return {
    audio: { codec, channels, samplerate, bitsPerSample },
    ...(blockAlign && samplerate ? { duration: dataSize / blockAlign / samplerate } : {}),
  }
}

function inspectWav(bytes: Uint8Array): Inspection {
  if (ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WAVE') {
    if (ascii(bytes, 0, 4) === 'RF64') throw new Error('RF64 WAV is not supported yet.')
    throw new Error('This file is not a RIFF/WAVE audio file.')
  }
  const chunks = riffChunks(bytes)
  const items: MetadataItem[] = []
  for (const chunk of chunks) {
    if (chunk.id === 'LIST') {
      if (ascii(bytes, chunk.start + 8, 4) === 'INFO') items.push(...parseInfoChunk(bytes, chunk))
      else items.push({ container: 'RIFF other chunk', id: chunk.id, label: 'RIFF LIST chunk', value: `<${chunk.size} bytes>` })
    }
    else if (chunk.id === 'id3 ') items.push(...inspectId3Chunk(bytes.subarray(chunk.start + 8, chunk.end)))
    else if (chunk.id === 'bext') {
      const fields: Array<[string, number, number]> = [['Description', 0, 256], ['Originator', 256, 32], ['Originator reference', 288, 32], ['Origination date', 320, 10], ['Origination time', 330, 8]]
      for (const [label, offset, length] of fields) {
        if (chunk.size < offset + length) continue
        const value = cleanText(latinDecoder.decode(bytes.subarray(chunk.start + 8 + offset, chunk.start + 8 + offset + length)))
        if (value) items.push({ container: 'RIFF bext', id: 'bext', label, value })
      }
      if (chunk.size > 602) items.push({ container: 'RIFF bext', id: 'bext', label: 'Coding history', value: cleanText(latinDecoder.decode(bytes.subarray(chunk.start + 8 + 602, chunk.end))) })
    } else if (chunk.id === 'iXML') {
      const value = cleanText(textDecoder.decode(bytes.subarray(chunk.start + 8, chunk.end)))
      items.push({ container: 'RIFF iXML', id: 'iXML', label: 'iXML metadata', value: value || `<${chunk.size} bytes>` })
    } else if (!['fmt ', 'fact', 'data'].includes(chunk.id)) {
      items.push({ container: 'RIFF other chunk', id: chunk.id, label: `RIFF ${chunk.id} chunk`, value: `<${chunk.size} bytes>` })
    }
  }
  const audio = wavInfo(bytes, chunks)
  return { format: 'wav', items, ...audio, suno: sunoHint(items) }
}

export function inspect(bytes: Uint8Array, filename: string): Inspection {
  const extension = filename.toLowerCase().split('.').pop()
  if (extension === 'wav' || ascii(bytes, 0, 4) === 'RIFF' || ascii(bytes, 0, 4) === 'RF64') return inspectWav(bytes)
  if (extension !== 'mp3' && !scanLeadingId3(bytes).items.length) throw new Error('Only MP3 and WAV files are supported.')
  const leading = scanLeadingId3(bytes)
  const items = [...leading.items, ...parseTailMetadata(bytes)]
  const { audio, duration } = mp3AudioInfo(bytes, leading.audioStart)
  return { format: 'mp3', items, audio, ...(duration ? { duration } : {}), suno: sunoHint(items) }
}

function toBase64Bytes(value: string): Uint8Array {
  const binary = typeof atob === 'function' ? atob(value) : ''
  if (!binary) throw new Error('Cover image data is invalid.')
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function syncSafeBytes(value: number): Uint8Array {
  return new Uint8Array([(value >> 21) & 0x7f, (value >> 14) & 0x7f, (value >> 7) & 0x7f, value & 0x7f])
}

const encoder = new TextEncoder()

function id3Frame(id: string, payload: Uint8Array): Uint8Array {
  return joinBytes([encoder.encode(id), syncSafeBytes(payload.length), new Uint8Array(2), payload])
}

function encodedText(value: string): Uint8Array {
  return joinBytes([new Uint8Array([3]), encoder.encode(value)])
}

export function writeId3v24(tags: TagSet): Uint8Array {
  const frames: Uint8Array[] = []
  for (const [key, id] of WRITE_FRAME_MAP) {
    const value = tags[key]
    if (typeof value === 'string' && value.trim()) frames.push(id3Frame(id, encodedText(value)))
  }
  if (tags.comment?.trim()) {
    const language = (tags.language || 'nld').toLowerCase().padEnd(3, ' ').slice(0, 3)
    frames.push(id3Frame('COMM', joinBytes([new Uint8Array([3]), encoder.encode(language), new Uint8Array([0]), encoder.encode(tags.comment)])))
  }
  if (tags.lyrics?.trim()) {
    const language = (tags.language || 'nld').toLowerCase().padEnd(3, ' ').slice(0, 3)
    frames.push(id3Frame('USLT', joinBytes([new Uint8Array([3]), encoder.encode(language), new Uint8Array([0]), encoder.encode(tags.lyrics)])))
  }
  if (tags.cover?.data) {
    const mime = tags.cover.mime || 'image/jpeg'
    frames.push(id3Frame('APIC', joinBytes([new Uint8Array([3]), encoder.encode(mime), new Uint8Array([0, 3, 0]), toBase64Bytes(tags.cover.data)])))
  }
  if (tags.website?.trim()) frames.push(id3Frame('WOAR', encoder.encode(tags.website)))
  const body = joinBytes(frames)
  return joinBytes([encoder.encode('ID3'), new Uint8Array([4, 0, 0]), syncSafeBytes(body.length), body])
}

function joinBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const output = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    output.set(part, offset)
    offset += part.length
  }
  return output
}

function stripMp3Tail(bytes: Uint8Array): number {
  let end = bytes.length
  let changed = true
  while (changed) {
    changed = false
    if (end >= 128 && ascii(bytes, end - 128, 3) === 'TAG') {
      end -= 128
      changed = true
      continue
    }
    if (end >= 32 && ascii(bytes, end - 32, 8) === 'APETAGEX') {
      const size = u32le(bytes, end - 20)
      const start = end - size
      const hasHeader = ascii(bytes, start - 32, 8) === 'APETAGEX'
      const removeStart = hasHeader ? start - 32 : start
      if (removeStart >= 0 && removeStart < end - 32) {
        end = removeStart
        changed = true
        continue
      }
    }
    if (end >= 9 && ascii(bytes, end - 9, 9) === 'LYRICS200') {
      const sizeText = ascii(bytes, end - 15, 6)
      const size = Number(sizeText)
      const begin = end - 15 - size - 11
      if (/^\d{6}$/.test(sizeText) && begin >= 0 && ascii(bytes, begin, 11) === 'LYRICSBEGIN') {
        end = begin
        changed = true
      }
    }
  }
  return end
}

function chunk(id: string, data: Uint8Array): Uint8Array {
  const size = new Uint8Array(4)
  new DataView(size.buffer).setUint32(0, data.length, true)
  return joinBytes([encoder.encode(id), size, data, ...(data.length & 1 ? [new Uint8Array([0])] : [])])
}

function wavInfoChunk(tags: TagSet): Uint8Array {
  const fields: Array<[keyof TagSet, string]> = [
    ['title', 'INAM'], ['artist', 'IART'], ['album', 'IPRD'], ['date', 'ICRD'],
    ['genre', 'IGNR'], ['copyright', 'ICOP'], ['comment', 'ICMT'],
    ['encoded_by', 'ISFT'], ['composer', 'IENG'],
  ]
  const entries: Uint8Array[] = []
  for (const [field, id] of fields) {
    const value = tags[field]
    if (typeof value !== 'string' || !value.trim()) continue
    entries.push(chunk(id, joinBytes([encoder.encode(value), new Uint8Array([0])])))
  }
  return chunk('LIST', joinBytes([encoder.encode('INFO'), ...entries]))
}

function cleanWav(bytes: Uint8Array, tags: TagSet): Uint8Array {
  if (ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WAVE') {
    if (ascii(bytes, 0, 4) === 'RF64') throw new Error('RF64 WAV is not supported yet.')
    throw new Error('This file is not a RIFF/WAVE audio file.')
  }
  const chunks = riffChunks(bytes)
  const kept = chunks.filter(({ id }) => ['fmt ', 'fact', 'data'].includes(id))
  if (!kept.some(({ id }) => id === 'fmt ') || !kept.some(({ id }) => id === 'data')) {
    throw new Error('WAV file must contain fmt and data chunks.')
  }
  const id3 = writeId3v24(tags)
  const body = joinBytes([
    ...kept.map(({ start, paddedEnd }) => bytes.subarray(start, paddedEnd)),
    wavInfoChunk(tags),
    chunk('id3 ', id3),
  ])
  const header = new Uint8Array(12)
  header.set(encoder.encode('RIFF'), 0)
  new DataView(header.buffer).setUint32(4, body.length + 4, true)
  header.set(encoder.encode('WAVE'), 8)
  return joinBytes([header, body])
}

export function clean(bytes: Uint8Array, format: AudioFormat, tags: TagSet): Uint8Array {
  if (format === 'wav') return cleanWav(bytes, tags)
  if (format !== 'mp3') throw new Error('Only MP3 and WAV files are supported.')
  const id3 = writeId3v24(tags)
  const leading = scanLeadingId3(bytes)
  const end = stripMp3Tail(bytes)
  if (leading.audioStart > end) throw new Error('No MP3 audio frames found.')
  return joinBytes([id3, bytes.subarray(leading.audioStart, end)])
}

function frameValue(items: MetadataItem[], ...ids: string[]): string | undefined {
  for (const id of ids) {
    const item = items.find((entry) => entry.id === id && entry.container === 'ID3v2.x')
    if (item) {
      if (['COMM', 'COM', 'USLT', 'ULT'].includes(id)) return item.value.slice(item.value.indexOf(':') + 1).trim()
      return item.value
    }
  }
  return undefined
}

export function suggest(inspection: Inspection, filename: string, profile: Profile): TagSet {
  const stem = filename.replace(/\.[^.]+$/, '')
  const sunoDate = inspection.suno?.created ?? ''
  const title = frameValue(inspection.items, 'TIT2', 'TT2') || stem
  const lyrics = frameValue(inspection.items, 'USLT', 'ULT') || ''
  return {
    ...profile,
    title,
    subtitle: '',
    'title-sort': profile['title-sort'],
    track: '',
    date: sunoDate,
    originaldate: sunoDate,
    releasedate: '',
    lyrics,
    cover: null,
  }
}

export function formatDuration(seconds?: number): string {
  if (!seconds || !Number.isFinite(seconds)) return '0:00'
  const whole = Math.floor(seconds)
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

export function containerFor(format: AudioFormat): MetadataContainer {
  return format === 'mp3' ? 'ID3v2.x' : 'RIFF id3 chunk'
}

export * from './analyzer'

