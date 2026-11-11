export interface AudioAnalysis {
  bpm: number
  key: string
  scale: 'major' | 'minor'
  camelot: string
  standardKey: string
  displayKey: string
  confidenceKey: number
  confidenceBpm: number
  danceability?: number
}

const CAMELOT_MAJOR: Record<string, string> = {
  B: '1B',
  'F#': '2B',
  Gb: '2B',
  'C#': '3B',
  Db: '3B',
  'G#': '4B',
  Ab: '4B',
  'D#': '5B',
  Eb: '5B',
  'A#': '6B',
  Bb: '6B',
  F: '7B',
  C: '8B',
  G: '9B',
  D: '10B',
  A: '11B',
  E: '12B',
}

const CAMELOT_MINOR: Record<string, string> = {
  'G#': '1A',
  Ab: '1A',
  'D#': '2A',
  Eb: '2A',
  'A#': '3A',
  Bb: '3A',
  F: '4A',
  C: '5A',
  G: '6A',
  D: '7A',
  A: '8A',
  E: '9A',
  B: '10A',
  'F#': '11A',
  Gb: '11A',
  'C#': '12A',
  Db: '12A',
}

export function toCamelot(key: string, scale: string): string {
  const normalizedKey = key.trim()
  const isMinor = /minor|min|m$/i.test(scale)
  if (isMinor) {
    return CAMELOT_MINOR[normalizedKey] || ''
  }
  return CAMELOT_MAJOR[normalizedKey] || ''
}

export function formatStandardKey(key: string, scale: string): string {
  const normalizedKey = key.trim()
  const isMinor = /minor|min|m$/i.test(scale)
  return isMinor ? `${normalizedKey}m` : normalizedKey
}

export function formatDisplayKey(key: string, scale: string): string {
  const normKey = key.trim()
  const isMinor = /minor|min|m$/i.test(scale)
  const fullScale = isMinor ? 'minor' : 'major'
  const camelot = toCamelot(normKey, fullScale)
  const std = formatStandardKey(normKey, fullScale)
  return camelot ? `${normKey} ${fullScale} (${camelot} / ${std})` : `${normKey} ${fullScale}`
}
