import type { AudioAnalysis } from './analyzer.types'
import type { AnalyzeWorkerRequest, AnalyzeWorkerResponse } from './analyzer.worker'

let sharedAudioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    sharedAudioContext = new AudioContextClass()
  }
  if (sharedAudioContext.state === 'suspended') {
    void sharedAudioContext.resume()
  }
  return sharedAudioContext
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

/**
 * Decodes audio in browser and analyzes BPM, Musical Key & Camelot notation using Essentia.js WASM.
 */
export async function analyzeAudio(audioFileOrBlob: Blob): Promise<AudioAnalysis> {
  const arrayBuffer = await audioFileOrBlob.arrayBuffer()
  const ctx = getAudioContext()

  // decodeAudioData detaches the buffer in some browser implementations, so slice it
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0))
  const { channelData, sampleRate } = extractAnalysisSegment(audioBuffer)

  return new Promise<AudioAnalysis>((resolve, reject) => {
    const worker = new Worker(new URL('./analyzer.worker.ts', import.meta.url), { type: 'module' })

    worker.onmessage = (event: MessageEvent<AnalyzeWorkerResponse>) => {
      worker.terminate()
      if (event.data.success) {
        resolve(event.data.analysis)
      } else {
        reject(new Error(event.data.error || 'Audio analysis failed'))
      }
    }

    worker.onerror = (err) => {
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

export * from './analyzer.types'
