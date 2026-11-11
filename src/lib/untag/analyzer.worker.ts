// Ensure Emscripten correctly detects Web Worker environment in ES Module workers
if (typeof self !== 'undefined' && typeof (self as any).importScripts === 'undefined') {
  ;(self as any).importScripts = () => {}
}

// @ts-expect-error essentia wasm bundle
import { EssentiaWASM } from 'essentia.js/dist/essentia-wasm.es.js'
// @ts-expect-error essentia core bundle
import Essentia from 'essentia.js/dist/essentia.js-core.es.js'
import {
  toCamelot,
  formatStandardKey,
  formatDisplayKey,
  type AudioAnalysis,
} from './analyzer.types'

let essentiaInstance: any = null

function getEssentia() {
  if (!essentiaInstance) {
    essentiaInstance = new Essentia(EssentiaWASM)
  }
  return essentiaInstance
}

export interface AnalyzeWorkerRequest {
  channelData: Float32Array
  sampleRate: number
}

export type AnalyzeWorkerResponse =
  | { success: true; analysis: AudioAnalysis }
  | { success: false; error: string }

self.onmessage = (event: MessageEvent<AnalyzeWorkerRequest>) => {
  try {
    const { channelData, sampleRate } = event.data
    if (!channelData || channelData.length === 0) {
      throw new Error('No audio data received')
    }

    const ai = getEssentia()

    // Minimum 4096 samples needed for KeyExtractor frameSize
    let audioData = channelData
    if (audioData.length < 4096) {
      const padded = new Float32Array(4096)
      padded.set(audioData)
      audioData = padded
    }

    // Convert Float32Array to Essentia C++ Vector
    const signalVector = ai.arrayToVector(audioData)

    try {
      // 1. Rhythm & BPM extraction
      // Use multifeature method within standard DJ/music range 50-205 BPM
      let bpm = 0
      let confidenceBpm = 0
      try {
        const rhythm = ai.RhythmExtractor2013(signalVector, 208, 'multifeature', 45)
        const rawBpm = rhythm?.bpm ?? 0
        bpm = Math.round(rawBpm)
        confidenceBpm = typeof rhythm?.confidence === 'number' ? Number(rhythm.confidence.toFixed(2)) : 0
      } catch (err) {
        console.warn('Essentia RhythmExtractor failed:', err)
      }

      // 2. Key & Scale extraction (EDMA profile)
      // KeyExtractor(audio, averageDetuningCorrection, frameSize, hopSize, hpcpSize, maxFreq, maxPeaks, minFreq, pcpThresh, profileType, sampleRate)
      let key = 'C'
      let scale: 'major' | 'minor' = 'major'
      let confidenceKey = 0
      try {
        const keyProfile = ai.KeyExtractor(
          signalVector,
          true,
          4096,
          4096,
          12,
          3500,
          60,
          25,
          0.2,
          'edma',
          sampleRate || 44100,
        )
        key = keyProfile?.key || 'C'
        scale = (keyProfile?.scale?.toLowerCase() === 'minor' ? 'minor' : 'major') as 'major' | 'minor'
        confidenceKey = typeof keyProfile?.strength === 'number' ? Number(keyProfile.strength.toFixed(2)) : 0
      } catch (err) {
        console.warn('Essentia KeyExtractor failed:', err)
      }

      const camelot = toCamelot(key, scale)
      const standardKey = formatStandardKey(key, scale)
      const displayKey = formatDisplayKey(key, scale)

      // 3. Optional: Danceability estimation
      let danceability: number | undefined
      try {
        if (typeof ai.Danceability === 'function') {
          const dance = ai.Danceability(signalVector)
          if (dance && typeof dance.danceability === 'number') {
            danceability = Number(dance.danceability.toFixed(2))
          }
        }
      } catch {
        // Danceability is optional
      }

      const analysis: AudioAnalysis = {
        bpm,
        key,
        scale,
        camelot,
        standardKey,
        displayKey,
        confidenceKey,
        confidenceBpm,
        danceability,
      }

      self.postMessage({ success: true, analysis } satisfies AnalyzeWorkerResponse)
    } finally {
      // Always cleanup WASM memory
      if (signalVector && typeof signalVector.delete === 'function') {
        signalVector.delete()
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Audio analysis failed'
    self.postMessage({ success: false, error: message } satisfies AnalyzeWorkerResponse)
  }
}
