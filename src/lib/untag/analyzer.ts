import type { AudioAnalysis } from './analyzer.types'
import type { AnalyzeWorkerRequest, AnalyzeWorkerResponse } from './analyzer.worker'

function getDecodingContext(): BaseAudioContext {
  const OfflineContextClass =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext
  if (OfflineContextClass) {
    try {
      return new OfflineContextClass(1, 44100, 44100)
    } catch {
      // Fall through to live AudioContext if OfflineAudioContext fails
    }
  }

  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  return new AudioContextClass()
}

/**
 * Extracts a representative mono Float32Array segment for analysis.
 * Takes up to 90 seconds from the middle/active portion of the track to ensure
 * reliable beat and harmonic detection without analyzing an entire 10-minute master.
 */
function extractAnalysisSegment(audioBuffer: AudioBuffer): { channelData: Float32Array; sampleRate: number } {
  const sampleRate = audioBuffer.sampleRate
  const totalLength = audioBuffer.length
  const duration = audioBuffer.duration

  const maxDuration = 90 // seconds
  const maxSamples = Math.min(totalLength, Math.round(maxDuration * sampleRate))

  // Offset by ~10s if track is long enough, to skip silent/ambient intro
  let startSample = 0
  if (duration > 30) {
    startSample = Math.min(Math.round(10 * sampleRate), totalLength - maxSamples)
  }

  const length = Math.min(maxSamples, totalLength - startSample)
  const mono = new Float32Array(length)

  const left = audioBuffer.getChannelData(0)
  const hasRight = audioBuffer.numberOfChannels > 1
  const right = hasRight ? audioBuffer.getChannelData(1) : null

  if (right) {
    for (let i = 0; i < length; i++) {
      const idx = startSample + i
      mono[i] = (left[idx] + right[idx]) * 0.5
    }
  } else {
    for (let i = 0; i < length; i++) {
      mono[i] = left[startSample + i]
    }
  }

  return { channelData: mono, sampleRate }
}

async function decodeAudioDataSafe(ctx: BaseAudioContext, buffer: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise<AudioBuffer>((resolve, reject) => {
    let resolved = false
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true
        reject(new Error('Audio decoding timed out'))
      }
    }, 15000)

    const onDone = (buf: AudioBuffer) => {
      if (!resolved) {
        resolved = true
        clearTimeout(timeout)
        resolve(buf)
      }
    }

    const onErr = (err: unknown) => {
      if (!resolved) {
        resolved = true
        clearTimeout(timeout)
        reject(err instanceof Error ? err : new Error(String(err || 'Failed to decode audio data')))
      }
    }

    try {
      const res = ctx.decodeAudioData(buffer, onDone, onErr)
      if (res && typeof (res as Promise<AudioBuffer>).then === 'function') {
        res.then(onDone, onErr)
      }
    } catch (err) {
      clearTimeout(timeout)
      reject(err)
    }
  })
}

async function analyzeAudioInternal(audioFileOrBlob: Blob): Promise<AudioAnalysis> {
  const arrayBuffer = await audioFileOrBlob.arrayBuffer()
  const ctx = getDecodingContext()

  // decodeAudioData detaches the buffer in some browser implementations, so slice it
  const audioBuffer = await decodeAudioDataSafe(ctx, arrayBuffer.slice(0))
  const { channelData, sampleRate } = extractAnalysisSegment(audioBuffer)

  return new Promise<AudioAnalysis>((resolve, reject) => {
    const worker = new Worker(new URL('./analyzer.worker.ts', import.meta.url), { type: 'module' })

    const timeout = setTimeout(() => {
      worker.terminate()
      reject(new Error('Audio analysis worker timed out'))
    }, 25000)

    worker.onmessage = (event: MessageEvent<AnalyzeWorkerResponse>) => {
      clearTimeout(timeout)
      worker.terminate()
      if (event.data.success) {
        resolve(event.data.analysis)
      } else {
        reject(new Error(event.data.error || 'Audio analysis failed'))
      }
    }

    worker.onerror = (err) => {
      clearTimeout(timeout)
      worker.terminate()
      reject(new Error(err.message || 'Analysis worker failed'))
    }

    const payload: AnalyzeWorkerRequest = {
      channelData,
      sampleRate,
    }

    // Transfer the channelData buffer for zero-copy performance
    worker.postMessage(payload, [channelData.buffer])
  })
}

/**
 * Decodes audio in browser and analyzes BPM, Musical Key & Camelot notation using Essentia.js WASM.
 * Protected by an overarching 30s timeout guard to prevent any infinite loading state.
 */
export async function analyzeAudio(audioFileOrBlob: Blob): Promise<AudioAnalysis> {
  return Promise.race([
    analyzeAudioInternal(audioFileOrBlob),
    new Promise<AudioAnalysis>((_, reject) => {
      setTimeout(() => reject(new Error('Audio analysis timed out')), 30000)
    }),
  ])
}

export * from './analyzer.types'
