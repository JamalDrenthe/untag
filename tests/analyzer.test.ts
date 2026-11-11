import { describe, expect, it } from 'vitest'
import {
  toCamelot,
  formatStandardKey,
  formatDisplayKey,
} from '../src/lib/untag/analyzer.types'

describe('Camelot and Musical Key conversion', () => {
  it('correctly maps major keys to Camelot', () => {
    expect(toCamelot('C', 'major')).toBe('8B')
    expect(toCamelot('G', 'major')).toBe('9B')
    expect(toCamelot('D', 'major')).toBe('10B')
    expect(toCamelot('A', 'major')).toBe('11B')
    expect(toCamelot('E', 'major')).toBe('12B')
    expect(toCamelot('B', 'major')).toBe('1B')
    expect(toCamelot('F#', 'major')).toBe('2B')
    expect(toCamelot('F', 'major')).toBe('7B')
  })

  it('correctly maps minor keys to Camelot', () => {
    expect(toCamelot('A', 'minor')).toBe('8A')
    expect(toCamelot('E', 'minor')).toBe('9A')
    expect(toCamelot('B', 'minor')).toBe('10A')
    expect(toCamelot('F#', 'minor')).toBe('11A')
    expect(toCamelot('C#', 'minor')).toBe('12A')
    expect(toCamelot('G#', 'minor')).toBe('1A')
    expect(toCamelot('C', 'minor')).toBe('5A')
    expect(toCamelot('D', 'minor')).toBe('7A')
  })

  it('formats standard ID3 TKEY strings properly', () => {
    expect(formatStandardKey('A', 'minor')).toBe('Am')
    expect(formatStandardKey('C', 'major')).toBe('C')
    expect(formatStandardKey('F#', 'minor')).toBe('F#m')
  })

  it('formats human readable display keys', () => {
    expect(formatDisplayKey('A', 'minor')).toBe('A minor (8A / Am)')
    expect(formatDisplayKey('C', 'major')).toBe('C major (8B / C)')
  })
})
