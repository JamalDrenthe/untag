const MAX_BYTES = 100 * 1024 * 1024
const NO_STORE = { 'Cache-Control': 'no-store' }

async function readLimited(request: Request): Promise<Uint8Array> {
  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > MAX_BYTES) throw new Response('File exceeds the 100 MB limit.', { status: 413, headers: NO_STORE })
  if (!request.body) return new Uint8Array()
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_BYTES) {
      await reader.cancel()
      throw new Response('File exceeds the 100 MB limit.', { status: 413, headers: NO_STORE })
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

function decodeBase64Url(encoded: string): Uint8Array {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encoded.length / 4) * 4, '=')
  const binary = atob(base64)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  }
  return btoa(binary)
}

export const onRequestPost = async ({ request }: { request: Request }): Promise<Response> => {
  try {
    const input = await readLimited(request)
    let audioBytes = input
    const contentType = request.headers.get('content-type') ?? ''
    let filename = request.headers.get('x-filename') || 'audio.mp3'
    let tagsValue = request.headers.get('x-tags') ?? ''
    let tags: Record<string, unknown> | undefined
    if (contentType.includes('multipart/form-data')) {
      const form = await new Response(input as Uint8Array<ArrayBuffer>, { headers: { 'Content-Type': contentType } }).formData()
      const audio = form.get('file') ?? form.get('audio')
      const field = form.get('tags')
      if (!(audio instanceof File) || typeof field !== 'string') throw new Error('Multipart request needs an audio file and tags field.')
      if (audio.size > MAX_BYTES) return new Response('File exceeds the 100 MB limit.', { status: 413, headers: NO_STORE })
      audioBytes = new Uint8Array(await audio.arrayBuffer())
      filename = audio.name || filename
      tagsValue = field
      const cover = form.get('cover')
      if (cover instanceof File && cover.size) {
        const coverBytes = new Uint8Array(await cover.arrayBuffer())
        tags = JSON.parse(tagsValue) as Record<string, unknown>
        tags.cover = { mime: cover.type || 'image/jpeg', data: encodeBase64(coverBytes) }
      }
    } else if (tagsValue) {
      tags = JSON.parse(new TextDecoder().decode(decodeBase64Url(tagsValue))) as Record<string, unknown>
    }
    if (!tags && tagsValue) tags = JSON.parse(tagsValue) as Record<string, unknown>
    if (!tags || typeof tags !== 'object') throw new Error('Missing metadata tags.')
    const format = filename.toLowerCase().endsWith('.wav') ? 'wav' : 'mp3'
    const { clean } = await import('../../src/lib/untag/index')
    const output = clean(audioBytes, format, tags as never)
    const safeName = filename.replace(/[\r\n"\\]/g, '_')
    return new Response(output as Uint8Array<ArrayBuffer>, {
      headers: {
        ...NO_STORE,
        'Content-Type': format === 'wav' ? 'audio/wav' : 'audio/mpeg',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}`,
      },
    })
  } catch (error) {
    if (error instanceof Response) {
      const headers = new Headers(error.headers)
      headers.set('Cache-Control', 'no-store')
      return new Response(error.body, { status: error.status, headers })
    }
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to clean this file.' },
      { status: 400, headers: NO_STORE },
    )
  }
}
