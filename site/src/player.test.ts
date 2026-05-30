import { describe, expect, it } from 'vitest'
import { edgeBetween } from './player'

describe('edgeBetween', () => {
  it('returns {from,to} when both ids are truthy', () => {
    expect(edgeBetween('a', 'b')).toEqual({ from: 'a', to: 'b' })
  })

  it('returns null when from is undefined', () => {
    expect(edgeBetween(undefined, 'b')).toBeNull()
  })

  it('returns null when to is undefined', () => {
    expect(edgeBetween('a', undefined)).toBeNull()
  })

  it('returns null when both are undefined', () => {
    expect(edgeBetween(undefined, undefined)).toBeNull()
  })

  it('returns null when an id is the empty string (falsy)', () => {
    expect(edgeBetween('', 'b')).toBeNull()
    expect(edgeBetween('a', '')).toBeNull()
  })
})
