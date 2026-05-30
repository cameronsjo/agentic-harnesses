import type { LoopSpec, Scenario } from './types'
import { SCENARIO_ORDER } from './types'

// Auto-discover every loop spec next to the schema. New harness files drop in
// without touching this module. schema.json has no `harness` field, so it's filtered out.
const modules = import.meta.glob<{ default: unknown }>('./data/loops/*.json', { eager: true })

export const specs: LoopSpec[] = Object.entries(modules)
  .filter(([path]) => !path.endsWith('schema.json'))
  .map(([, mod]) => mod.default as LoopSpec)
  .filter((s): s is LoopSpec => Boolean(s && (s as LoopSpec).harness))
  .sort((a, b) => a.displayName.localeCompare(b.displayName))

export function specByHarness(harness: string): LoopSpec | undefined {
  return specs.find((s) => s.harness === harness)
}

export function scenario(spec: LoopSpec, id: string): Scenario | undefined {
  return spec.scenarios.find((s) => s.id === id)
}

// Scenario ids present in every harness, in canonical order.
export const sharedScenarios: { id: string; title: string }[] = SCENARIO_ORDER.filter((id) =>
  specs.length > 0 ? specs.every((s) => s.scenarios.some((sc) => sc.id === id)) : false,
).map((id) => {
  const title = specs[0]?.scenarios.find((sc) => sc.id === id)?.title ?? id
  return { id, title }
})
