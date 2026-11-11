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
    const ai = getEssentia()

    // Convert Float32Array to Essentia C++ Vector
    const signalVector = ai.arrayToVector(channelData)

    try {
      // 1. Rhythm & BPM extraction
      // Use multifeature method (or degara) within standard DJ/music range 50-205 BPM
      const rhythm = ai.RhythmExtractor2013(signalVector, 208, 'multifeature', 45)
      const rawBpm = rhythm?.bpm ?? 0
      const bpm = Math.round(rawBpm)
      const confidenceBpm = typeof rhythm?.confidence === 'number' ? Number(rhythm.confidence.toFixed(2)) : 0

      // 2. Key & Scale extraction (EDMA profile)
      // KeyExtractor(audio, averageDetuningCorrection, frameSize, hopSize, hpcpSize, maxFreq, maxPeaks, minFreq, pcpThresh, profileType, sampleRate)
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

      const key = keyProfile?.key || 'C'
      const scale = (keyProfile?.scale?.toLowerCase() === 'minor' ? 'minor' : 'major') as 'major' | 'minor'
      const confidenceKey = typeof keyProfile?.strength === 'number' ? Number(keyProfile.strength.toFixed(2)) : 0

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
