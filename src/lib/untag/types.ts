export type AudioFormat = 'mp3' | 'wav'

export type MetadataContainer =
  | 'ID3v2.x'
  | 'ID3v1'
  | 'APEv2'
  | 'Lyrics3'
  | 'RIFF LIST-INFO'
  | 'RIFF id3 chunk'
  | 'RIFF bext'
  | 'RIFF iXML'
  | 'RIFF other chunk'

export interface MetadataItem {
  container: MetadataContainer
  id: string
  label: string
  value: string
}

export interface AudioInfo {
  bitrate?: number
  samplerate?: number
  channels?: number
  bitsPerSample?: number
  codec?: string
}

export interface SunoHint {
  created?: string
  id?: string
}

export interface Inspection {
  format: AudioFormat
  items: MetadataItem[]
  audio: AudioInfo
  duration?: number
  suno?: SunoHint
}

export interface CoverTag {
  mime: string
  data: string
}

export interface TagSet {
  grouping: string
  title: string
  subtitle: string
  artist: string
  album_artist: string
  conductor: string
  remixer: string
  composer: string
  lyricist: string
  original_artist: string
  album: string
  track: string
  disc: string
  compilation: string
  date: string
  originaldate: string
  releasedate: string
  genre: string
  bpm: string
  initialkey: string
  mood: string
  'title-sort': string
  'artist-sort': string
  'album-sort': string
  'composer-sort': string
  language: string
  media_type: string
  isrc: string
  publisher: string
  copyright: string
  producer_rights: string
  encoded_by: string
  comment: string
  lyrics: string
  website: string
  cover?: CoverTag | null
}

export type Profile = Omit<TagSet, 'title' | 'subtitle' | 'track' | 'date' | 'originaldate' | 'releasedate' | 'lyrics' | 'cover'>

export const TAG_FIELDS: Array<{ key: keyof TagSet; group: string; label: string }> = [
  { key: 'grouping', group: 'titles', label: 'Grouping' },
  { key: 'title', group: 'titles', label: 'Title' },
  { key: 'subtitle', group: 'titles', label: 'Subtitle' },
  { key: 'artist', group: 'performers', label: 'Artist' },
  { key: 'album_artist', group: 'performers', label: 'Album artist' },
  { key: 'conductor', group: 'performers', label: 'Conductor' },
  { key: 'remixer', group: 'performers', label: 'Remixer' },
  { key: 'composer', group: 'authors', label: 'Composer' },
  { key: 'lyricist', group: 'authors', label: 'Lyricist' },
  { key: 'original_artist', group: 'authors', label: 'Original artist' },
  { key: 'album', group: 'album', label: 'Album' },
  { key: 'track', group: 'album', label: 'Track' },
  { key: 'disc', group: 'album', label: 'Disc' },
  { key: 'compilation', group: 'album', label: 'Compilation' },
  { key: 'date', group: 'dates', label: 'Date' },
  { key: 'originaldate', group: 'dates', label: 'Original date' },
  { key: 'releasedate', group: 'dates', label: 'Release date' },
  { key: 'genre', group: 'music', label: 'Genre' },
  { key: 'bpm', group: 'music', label: 'BPM' },
  { key: 'initialkey', group: 'music', label: 'Initial key' },
  { key: 'mood', group: 'music', label: 'Mood' },
  { key: 'title-sort', group: 'sorting', label: 'Title sort' },
  { key: 'artist-sort', group: 'sorting', label: 'Artist sort' },
  { key: 'album-sort', group: 'sorting', label: 'Album sort' },
  { key: 'composer-sort', group: 'sorting', label: 'Composer sort' },
  { key: 'language', group: 'language', label: 'Language' },
  { key: 'media_type', group: 'language', label: 'Media type' },
  { key: 'isrc', group: 'rights', label: 'ISRC' },
  { key: 'publisher', group: 'rights', label: 'Publisher' },
  { key: 'copyright', group: 'rights', label: 'Copyright' },
  { key: 'producer_rights', group: 'rights', label: 'Producer rights' },
  { key: 'encoded_by', group: 'rights', label: 'Encoded by' },
  { key: 'comment', group: 'text', label: 'Comment' },
  { key: 'lyrics', group: 'text', label: 'Lyrics' },
  { key: 'website', group: 'text', label: 'Website' },
]

export const PROFILE_FIELDS = TAG_FIELDS.filter(({ key }) =>
  !['title', 'subtitle', 'track', 'date', 'originaldate', 'releasedate', 'lyrics'].includes(key),
)

export const DEFAULT_PROFILE: Profile = {
  grouping: '',
  artist: 'Jamal Drenthe',
  album_artist: 'Jamal Drenthe',
  conductor: '',
  remixer: '',
  composer: 'Jamal Drenthe',
  lyricist: 'Jamal Drenthe',
  original_artist: '',
  album: '',
  disc: '1/1',
  compilation: '0',
  genre: 'Hip-Hop',
  bpm: '',
  initialkey: '',
  mood: '',
  'title-sort': '',
  'artist-sort': 'Drenthe, Jamal',
  'album-sort': '',
  'composer-sort': 'Drenthe, Jamal',
  language: 'nld',
  media_type: 'Digital',
  isrc: '',
  publisher: 'Jamal Drenthe',
  copyright: `(c) ${new Date().getFullYear()} Jamal Drenthe`,
  producer_rights: `(p) ${new Date().getFullYear()} Jamal Drenthe`,
  encoded_by: 'Jamal Drenthe Clean',
  comment: 'Produced by Jamal Drenthe',
  website: 'https://www.jamaldrenthe.com',
}
