import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PROFILE,
  clean,
  inspect,
  suggest,
  type AudioFormat,
  type TagSet,
} from '../src/lib/untag'

const sourceDir = '/home/ubuntu/suno_raw'
const sunoFiles = [
  'Appelmoes.wav',
  'BLXCKWAXABI & MaDarra - MAN DOWN.mp3',
  'Coco x Coco (Mashup).wav',
  'Dmt.wav',
  'Draai.mp3',
  'Faya Bon Deng.wav',
  'Geweten.mp3',
  'Grovey.wav',
  'Jij doet mee.wav',
  'Keti Koti.mp3',
  'Kipschnitzel.mp3',
  'Knibbel Knabbel Knuisje.mp3',
  'Niet stotter.mp3',
  'November.mp3',
  'Weg wezen.mp3',
  'Wip.mp3',
  'kwijt.wav',
  'schoolshitfriends - blxckwaxabi.mp3',
]

const sampleTags: TagSet = {
  ...DEFAULT_PROFILE,
  title: 'Clean title',
  subtitle: '',
  'title-sort': 'Clean title',
  track: '1/1',
  date: '2026-10-03',
  originaldate: '2026-10-03',
  releasedate: '',
  lyrics: '',
}

function ascii(value: string): Uint8Array {
  return new TextEncoder().encode(value)
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

function le32(value: number): Uint8Array {
  const bytes = new Uint8Array(4)
  new DataView(bytes.buffer).setUint32(0, value, true)
  return bytes
}

function be32(value: number): Uint8Array {
  const bytes = new Uint8Array(4)
  new DataView(bytes.buffer).setUint32(0, value, false)
  return bytes
}

function synchsafe(value: number): Uint8Array {
  return new Uint8Array([(value >> 21) & 0x7f, (value >> 14) & 0x7f, (value >> 7) & 0x7f, value & 0x7f])
}

function riffChunk(id: string, data: Uint8Array): Uint8Array {
  return concat(ascii(id), le32(data.length), data, ...(data.length & 1 ? [new Uint8Array([0])] : []))
}

function minimalWav(): Uint8Array {
  const fmt = new Uint8Array(16)
  const view = new DataView(fmt.buffer)
  view.setUint16(0, 1, true)
  view.setUint16(2, 1, true)
  view.setUint32(4, 8000, true)
  view.setUint32(8, 16000, true)
  view.setUint16(12, 2, true)
  view.setUint16(14, 16, true)
  const payload = concat(riffChunk('fmt ', fmt), riffChunk('data', new Uint8Array([1, 2, 3, 4, 5])))
  return concat(ascii('RIFF'), le32(payload.length + 4), ascii('WAVE'), payload)
}

function frame(id: string, payload: Uint8Array): Uint8Array {
  return concat(ascii(id), be32(payload.length), new Uint8Array(2), payload)
}

function v24Frame(id: string, payload: Uint8Array): Uint8Array {
  return concat(ascii(id), synchsafe(payload.length), new Uint8Array(2), payload)
}

function id3Tag(major: number, flags: number, body: Uint8Array): Uint8Array {
  return concat(ascii('ID3'), new Uint8Array([major, 0, flags]), synchsafe(body.length), body)
}

function makeMp3WithApeAndId3v1(): Uint8Array {
  const audio = new Uint8Array([0xff, 0xfb, 0x90, 0x64, 1, 2, 3, 4])
  const apeItem = concat(le32(4), le32(0), ascii('SunoKey'), new Uint8Array([0]), ascii('evil'))
  const apeSize = apeItem.length + 32
  const apeFooter = concat(ascii('APETAGEX'), le32(2000), le32(apeSize), le32(1), le32(0), new Uint8Array(8))
  const id3v1 = concat(ascii('TAG'), new Uint8Array(125).fill(65))
  return concat(audio, apeItem, apeFooter, id3v1)
}

function wavChunks(bytes: Uint8Array): Array<{ id: string; start: number; size: number; end: number }> {
  const chunks = []
  let offset = 12
  while (offset + 8 <= bytes.length) {
    const id = new TextDecoder().decode(bytes.subarray(offset, offset + 4))
    const size = new DataView(bytes.buffer, bytes.byteOffset + offset + 4, 4).getUint32(0, true)
    chunks.push({ id, start: offset, size, end: offset + 8 + size })
    offset += 8 + size + (size & 1)
  }
  return chunks
}

function wavData(bytes: Uint8Array): Uint8Array {
  const chunk = wavChunks(bytes).find(({ id }) => id === 'data')
  if (!chunk) throw new Error('No WAV data chunk')
  return bytes.subarray(chunk.start + 8, chunk.end)
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && Buffer.from(a).equals(Buffer.from(b))
}

describe('synthetic metadata edge cases', () => {
  it('strips ID3v1 and APEv2 appended after MP3 audio', () => {
    const source = makeMp3WithApeAndId3v1()
    const output = clean(source, 'mp3', sampleTags)
    const afterId3 = 10 + ((output[6] << 21) | (output[7] << 14) | (output[8] << 7) | output[9])
    expect([...output.subarray(afterId3)]).toEqual([0xff, 0xfb, 0x90, 0x64, 1, 2, 3, 4])
    expect(inspect(source, 'tail.mp3').items.map(({ container }) => container)).toContain('APEv2')
    expect(inspect(source, 'tail.mp3').items.map(({ container }) => container)).toContain('ID3v1')
  })

  it('decodes ID3v2.3 unsynchronised text', () => {
    const payload = new Uint8Array([0, 0x41, 0xff, 0x00, 0xe0])
    const titleFrame = frame('TIT2', payload)
    const body = concat(titleFrame)
    const tag = id3Tag(3, 0x80, body)
    const result = inspect(tag, 'unsync.mp3')
    expect(result.items.find(({ id }) => id === 'TIT2')?.value).toBe('Aÿà')
  })

  it('inspects and cleans/replaces WOAS (official audio source webpage)', () => {
    const sunoSourceUrl = 'https://suno.com/song/c810d794-0e31-419b-a3d8-a68132e49755'
    const woasFrame = frame('WOAS', ascii(sunoSourceUrl))
    const sourceTag = id3Tag(3, 0, concat(woasFrame, frame('TIT2', new Uint8Array([0, ...ascii('Track Title')]))))
    const inspected = inspect(sourceTag, 'suno.mp3')
    const woasItem = inspected.items.find(({ id }) => id === 'WOAS')
    expect(woasItem?.value).toBe(sunoSourceUrl)
    expect(woasItem?.label).toBe('Official audio source webpage')

    // Clean with custom audio_source_url
    const customTags: TagSet = {
      ...sampleTags,
      audio_source_url: 'https://www.jamaldrenthe.com/tracks/custom',
    }
    const audioPayload = new Uint8Array([0xff, 0xfb, 0x90, 0x64, 1, 2, 3, 4])
    const mp3Source = concat(sourceTag, audioPayload)
    const cleaned = clean(mp3Source, 'mp3', customTags)
    const reInspected = inspect(cleaned, 'clean.mp3')
    const cleanedWoas = reInspected.items.find(({ id }) => id === 'WOAS')
    expect(cleanedWoas?.value).toBe('https://www.jamaldrenthe.com/tracks/custom')
    expect(cleanedWoas?.value).not.toContain('suno')
  })

  it.each([0, 1, 2, 3])('decodes ID3v2.4 COMM text encoding %i', (encoding) => {
    const text = 'Made with Suno é'
    const encoded = encoding === 0
      ? new Uint8Array([...text].map((char) => char.charCodeAt(0)))
      : encoding === 1
        ? new Uint8Array([...text].flatMap((char) => [char.charCodeAt(0) & 0xff, char.charCodeAt(0) >> 8]))
        : encoding === 2
          ? new Uint8Array([...text].flatMap((char) => [char.charCodeAt(0) >> 8, char.charCodeAt(0) & 0xff]))
          : new TextEncoder().encode(text)
    const description = encoding === 1
      ? new Uint8Array([0xff, 0xfe, 0x6e, 0x00, 0x6f, 0x00, 0x74, 0x00, 0x65, 0x00])
      : encoding === 2
        ? new Uint8Array([0x00, 0x6e, 0x00, 0x6f, 0x00, 0x74, 0x00, 0x65])
        : ascii('note')
    const separator = encoding === 1 || encoding === 2 ? new Uint8Array([0, 0]) : new Uint8Array([0])
    const payload = concat(new Uint8Array([encoding]), ascii('eng'), description, separator, encoded)
    const tag = id3Tag(4, 0, v24Frame('COMM', payload))
    const result = inspect(tag, 'comment.mp3')
    expect(result.items.find(({ id }) => id === 'COMM')?.value).toBe('eng | note: Made with Suno é')
  })

  it('skips flagged ID3v2.3 and ID3v2.4 extended headers', () => {
    const v23Extended = concat(new Uint8Array([0, 0, 0, 6, 0, 0, 0, 0, 0, 0]), frame('TIT2', new Uint8Array([0, ...ascii('Good')])))
    const v24Extended = concat(new Uint8Array([0, 0, 0, 6, 1, 0]), v24Frame('TIT2', new Uint8Array([3, ...ascii('Good')])))
    expect(inspect(id3Tag(3, 0x40, v23Extended), 'extended.mp3').items.find(({ id }) => id === 'TIT2')?.value).toBe('Good')
    expect(inspect(id3Tag(4, 0x40, v24Extended), 'extended.mp3').items.find(({ id }) => id === 'TIT2')?.value).toBe('Good')
  })

  it('detects and strips a Lyrics3v2 tail', () => {
    const audio = new Uint8Array([0xff, 0xfb, 0x90, 0x64, 1, 2, 3, 4])
    const lyric = ascii('LYRICSBEGINLYRICS=words')
    const content = lyric.subarray(11)
    const tail = concat(lyric, ascii(String(content.length).padStart(6, '0')), ascii('LYRICS200'))
    const source = concat(audio, tail)
    expect(inspect(source, 'lyrics.mp3').items.find(({ container }) => container === 'Lyrics3')?.value).toBe('LYRICS=words')
    const output = clean(source, 'mp3', sampleTags)
    const afterId3 = 10 + ((output[6] << 21) | (output[7] << 14) | (output[8] << 7) | output[9])
    expect([...output.subarray(afterId3)]).toEqual([...audio])
  })

  it('preserves WAV audio and only emits fmt, data, LIST and id3 chunks', () => {
    const base = minimalWav()
    const fmtAndData = base.subarray(12)
    const extras = concat(
      riffChunk('bext', new Uint8Array(32)),
      riffChunk('iXML', ascii('<BWFXML/>')),
      riffChunk('cue ', new Uint8Array([1, 2, 3])),
      riffChunk('JUNK', new Uint8Array([8])),
    )
    const oldPayload = concat(fmtAndData, extras)
    const source = concat(ascii('RIFF'), le32(oldPayload.length + 4), ascii('WAVE'), oldPayload)
    const output = clean(source, 'wav', sampleTags)
    expect(bytesEqual(wavData(output), wavData(source))).toBe(true)
    expect(wavChunks(output).map(({ id }) => id)).toEqual(['fmt ', 'data', 'LIST', 'id3 '])
    expect(new DataView(output.buffer).getUint32(4, true)).toBe(output.length - 8)
    expect(inspect(source, 'edge.wav').items.some(({ id }) => id === 'iXML')).toBe(true)
    expect(inspect(output, 'edge.wav').items.some(({ id }) => id === 'iXML')).toBe(false)
  })
})

describe('Suno source library integration', () => {
  it.each(sunoFiles)('%s: inspects and cleans without changing audio', async (filename) => {
    const source = new Uint8Array(await readFile(join(sourceDir, filename)))
    const format: AudioFormat = filename.toLowerCase().endsWith('.wav') ? 'wav' : 'mp3'
    const before = inspect(source, filename)
    expect(before.items.some(({ value }) => /made with suno/i.test(value))).toBe(true)
    expect(before.suno?.id).toMatch(/[0-9a-f-]{36}/i)
    expect(before.suno?.created).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const tags = suggest(before, filename, DEFAULT_PROFILE)
    const originalLyrics = before.items.find(({ id }) => id === 'USLT' || id === 'ULT')
    if (originalLyrics) {
      expect(tags.lyrics).toBe(originalLyrics.value.slice(originalLyrics.value.indexOf(':') + 1).trim())
    }
    const cleaned = clean(source, format, tags)
    const after = inspect(cleaned, filename) as ReturnType<typeof inspect>
    expect(after.items.some(({ value }) => /suno|lavf/i.test(value))).toBe(false)
    for (const item of after.items) {
      expect(['ID3v2.x', 'RIFF id3 chunk', 'RIFF LIST-INFO']).toContain(item.container)
    }
    expect(after.items.some(({ id, value }) => id === 'TIT2' && value === tags.title)).toBe(true)
    expect(after.items.some(({ id, value }) => id === 'TENC' && value === tags.encoded_by)).toBe(true)
    if (originalLyrics) {
      const writtenLyrics = after.items.find(({ id }) => id === 'USLT')
      expect(writtenLyrics?.value.slice(writtenLyrics.value.indexOf(':') + 1).trim()).toBe(tags.lyrics)
    } else {
      expect(after.items.some(({ id }) => id === 'USLT')).toBe(false)
    }
    const frameIds: Record<string, string> = {
      grouping: 'TIT1', title: 'TIT2', subtitle: 'TIT3', artist: 'TPE1', album_artist: 'TPE2',
      conductor: 'TPE3', remixer: 'TPE4', composer: 'TCOM', lyricist: 'TEXT', original_artist: 'TOPE',
      album: 'TALB', track: 'TRCK', disc: 'TPOS', compilation: 'TCMP', date: 'TDRC',
      originaldate: 'TDOR', releasedate: 'TDRL', genre: 'TCON', bpm: 'TBPM', initialkey: 'TKEY',
      mood: 'TMOO', 'title-sort': 'TSOT', 'artist-sort': 'TSOP', 'album-sort': 'TSOA',
      'composer-sort': 'TSOC', language: 'TLAN', media_type: 'TMED', isrc: 'TSRC',
      publisher: 'TPUB', copyright: 'TCOP', producer_rights: 'TPRO', encoded_by: 'TENC',
      comment: 'COMM', lyrics: 'USLT', website: 'WOAR', audio_source_url: 'WOAS',
    }
    const id3Container = format === 'wav' ? 'RIFF id3 chunk' : 'ID3v2.x'
    const expectedIds = Object.entries(frameIds).filter(([key]) => Boolean(tags[key as keyof TagSet])).map(([, id]) => id).sort()
    const actualIds = after.items.filter(({ container }) => container === id3Container).map(({ id }) => id).sort()
    expect(actualIds).toEqual(expectedIds)
    for (const [key, id] of Object.entries(frameIds)) {
      const value = tags[key as keyof TagSet]
      if (typeof value !== 'string' || !value.trim()) continue
      const expectedValue = key === 'comment' || key === 'lyrics' ? `${tags.language || 'nld'}: ${value}` : value
      expect(after.items.find((item) => item.container === id3Container && item.id === id)?.value).toBe(expectedValue)
    }

    const dir = await mkdtemp(join(tmpdir(), 'untag-test-'))
    try {
      const originalPath = join(dir, 'original.' + format)
      const cleanPath = join(dir, 'clean.' + format)
      await writeFile(originalPath, source)
      await writeFile(cleanPath, cleaned)
      const probe = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format_tags', '-of', 'json', cleanPath], { encoding: 'utf8' })
      expect(probe.toLowerCase()).not.toContain('suno')
      expect(probe.toLowerCase()).not.toContain('lavf')
      if (format === 'wav') {
        expect(bytesEqual(wavData(cleaned), wavData(source))).toBe(true)
      } else {
        const md5 = (path: string) => execFileSync('ffmpeg', ['-v', 'error', '-i', path, '-map', '0:a', '-c', 'copy', '-f', 'md5', '-'], { encoding: 'utf8' }).trim()
        expect(md5(cleanPath)).toBe(md5(originalPath))
      }
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  }, 120_000)
})
