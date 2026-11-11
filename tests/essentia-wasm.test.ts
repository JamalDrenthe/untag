import { describe, expect, it } from 'vitest'
// @ts-expect-error essentia wasm bundle
import { EssentiaWASM } from 'essentia.js/dist/essentia-wasm.es.js'
// @ts-expect-error essentia core bundle
import Essentia from 'essentia.js/dist/essentia.js-core.es.js'

describe('Essentia.js WASM Engine', () => {
  it('initializes Essentia WASM instance', () => {
    const ai = new Essentia(EssentiaWASM)
    expect(ai.version).toBeTruthy()
    expect(typeof ai.RhythmExtractor2013).toBe('function')
    expect(typeof ai.KeyExtractor).toBe('function')
  })

  it('accurately estimates BPM of synthesized click track', () => {
    const ai = new Essentia(EssentiaWASM)
    const sampleRate = 44100
    const duration = 6 // 6 seconds
    const targetBpm = 120
    const interval = sampleRate * (60 / targetBpm) // every 0.5s

    const signal = new Float32Array(sampleRate * duration)
    for (let i = 0; i < signal.length; i++) {
      if (i % Math.round(interval) < 150) {
        signal[i] = Math.sin(2 * Math.PI * 880 * (i / sampleRate))
      }
    }

    const vec = ai.arrayToVector(signal)
    try {
      const rhythm = ai.RhythmExtractor2013(vec, 208, 'degara', 45)
      expect(Math.round(rhythm.bpm)).toBe(120)
    } finally {
      vec.delete()
    }
  })
})
