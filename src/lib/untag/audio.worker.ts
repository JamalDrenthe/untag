import { clean, inspect, type AudioFormat, type TagSet } from './index'

self.onmessage = (event: MessageEvent<{
  operation: 'inspect' | 'clean'
  bytes: ArrayBuffer
  filename: string
  format?: AudioFormat
  tags?: TagSet
}>) => {
  try {
    const { operation, bytes: buffer, filename, format, tags } = event.data
    const bytes = new Uint8Array(buffer)
    if (operation === 'inspect') {
      self.postMessage({ result: inspect(bytes, filename) })
    } else {
      const output = clean(bytes, format ?? 'mp3', tags!)
      self.postMessage({ result: output.buffer }, { transfer: [output.buffer] })
    }
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Local audio processing failed.' })
  }
}
