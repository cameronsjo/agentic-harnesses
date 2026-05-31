import { describe, expect, it } from 'vitest'
import { scenario, specByHarness, specs, sharedScenarios } from './data'
import { SCENARIO_ORDER } from './types'
import type { LoopSpec } from './types'

describe('specs — auto-discovered loop catalog', () => {
  it('discovers at least one spec', () => {
    expect(specs.length).toBeGreaterThan(0)
  })

  it('every entry has a harness id (schema.json filtered out)', () => {
    expect(specs.every((s) => Boolean(s.harness))).toBe(true)
    expect(specs.some((s) => (s as { $schema?: unknown }).$schema && !s.harness)).toBe(false)
  })

  it('is sorted by displayName', () => {
    const names = specs.map((s) => s.displayName)
    const sorted = [...names].sort((a, b) => a.localeCompare(b))
    expect(names).toEqual(sorted)
  })

  it('includes the claude-code harness', () => {
    expect(specs.some((s) => s.harness === 'claude-code')).toBe(true)
  })
})

describe('specByHarness', () => {
  it('returns the matching spec', () => {
    const cc = specByHarness('claude-code')
    expect(cc?.harness).toBe('claude-code')
  })

  it('returns undefined for an unknown harness', () => {
    expect(specByHarness('does-not-exist')).toBeUndefined()
  })
})

describe('scenario', () => {
  const spec = {
    harness: 'test',
    displayName: 'Test',
    language: 'TypeScript',
    loopStyle: 'test',
    nodes: [],
    edges: [],
    scenarios: [
      { id: 'a', title: 'Alpha', steps: [] },
      { id: 'b', title: 'Beta', steps: [] },
    ],
  } satisfies LoopSpec

  it('finds a scenario by id', () => {
    expect(scenario(spec, 'b')).toMatchObject({ id: 'b', title: 'Beta' })
  })

  it('returns undefined when the id is absent', () => {
    expect(scenario(spec, 'missing')).toBeUndefined()
  })
})

describe('sharedScenarios — ids present in every harness', () => {
  it('every shared id actually appears in every spec', () => {
    for (const shared of sharedScenarios) {
      expect(specs.every((s) => s.scenarios.some((sc) => sc.id === shared.id))).toBe(true)
    }
  })

  it('preserves SCENARIO_ORDER ordering', () => {
    const ids = sharedScenarios.map((s) => s.id)
    const expected = SCENARIO_ORDER.filter((id) => ids.includes(id))
    expect(ids).toEqual(expected)
  })

  it('carries a non-empty title for each shared id', () => {
    expect(sharedScenarios.every((s) => s.title.length > 0)).toBe(true)
  })
})
