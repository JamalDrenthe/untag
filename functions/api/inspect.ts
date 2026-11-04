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

export const onRequestPost = async ({ request }: { request: Request }): Promise<Response> => {
  try {
    const bytes = await readLimited(request)
    const filename = request.headers.get('x-filename') || 'audio.mp3'
    const { inspect } = await import('../../src/lib/untag/index')
    const result = inspect(bytes, filename)
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof Response) {
      const headers = new Headers(error.headers)
      headers.set('Cache-Control', 'no-store')
      return new Response(error.body, { status: error.status, headers })
    }
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to inspect this file.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
