import { describe, it, expect } from 'vitest'
import {
  numericToAlpha2,
  alpha2ToNumeric,
  nameForAlpha2,
  nameForNumeric,
} from './isoCountries'

describe('ISO alpha-2 <-> numeric join', () => {
  it('maps alpha-2 to numeric', () => {
    expect(alpha2ToNumeric('US')).toBe('840')
    expect(alpha2ToNumeric('PT')).toBe('620')
    expect(alpha2ToNumeric('GR')).toBe('300')
    expect(alpha2ToNumeric('fr')).toBe('250') // case-insensitive
  })

  it('maps numeric to alpha-2, tolerating unpadded ids', () => {
    expect(numericToAlpha2('840')).toBe('US')
    expect(numericToAlpha2('620')).toBe('PT')
    expect(numericToAlpha2(300)).toBe('GR') // numeric input
    expect(numericToAlpha2(4)).toBe('AF') // unpadded -> "004"
  })

  it('resolves names both ways', () => {
    expect(nameForAlpha2('PT')).toBe('Portugal')
    expect(nameForNumeric('300')).toBe('Greece')
  })

  it('returns undefined for unknown codes', () => {
    expect(alpha2ToNumeric('ZZ')).toBeUndefined()
    expect(numericToAlpha2('999')).toBeUndefined()
  })
})
