import { describe, expect, it } from 'vitest'
import { projectScenario } from './sequence'
import type { LoopNode, LoopSpec, Scenario } from './types'
import claudeCode from './data/loops/claude-code.json'

// Build a tiny spec containing one node per kind, with ids matching the kind name.
function specWith(nodes: LoopNode[]): LoopSpec {
  return {
    harness: 'test',
    displayName: 'Test',
    language: 'TypeScript',
    loopStyle: 'test',
    nodes,
    edges: [],
    scenarios: [],
  }
}

function scenario(steps: string[]): Scenario {
  return { id: 's', title: 's', steps }
}

const node = (id: string, kind: LoopNode['kind'], label = id): LoopNode => ({ id, label, kind })

describe('projectScenario — per-kind mapping', () => {
  it('input → one user→agent message', () => {
    const spec = specWith([node('n', 'input', 'User says hi')])
    const msgs = projectScenario(spec, scenario(['n']))
    expect(msgs).toHaveLength(1)
    expect(msgs[0]).toMatchObject({ from: 'user', to: 'agent', label: 'User says hi', kind: 'input', self: false, return: false })
  })

  it('llm → request (agent→model) then return (model→agent, return:true)', () => {
    const spec = specWith([node('n', 'llm')])
    const msgs = projectScenario(spec, scenario(['n']))
    expect(msgs).toHaveLength(2)
    expect(msgs[0]).toMatchObject({ from: 'agent', to: 'model', kind: 'llm', return: false })
    expect(msgs[1]).toMatchObject({ from: 'model', to: 'agent', kind: 'llm', return: true })
  })

  it('approval → one self-message (agent→agent, self:true)', () => {
    const spec = specWith([node('n', 'approval', 'gate')])
    const msgs = projectScenario(spec, scenario(['n']))
    expect(msgs).toHaveLength(1)
    expect(msgs[0]).toMatchObject({ from: 'agent', to: 'agent', label: 'gate', kind: 'approval', self: true })
  })

  it('execute → agent→tool then tool→agent (return:true)', () => {
    const spec = specWith([node('n', 'execute')])
    const msgs = projectScenario(spec, scenario(['n']))
    expect(msgs).toHaveLength(2)
    expect(msgs[0]).toMatchObject({ from: 'agent', to: 'tool', kind: 'execute', return: false })
    expect(msgs[1]).toMatchObject({ from: 'tool', to: 'agent', kind: 'execute', return: true })
  })

  it('terminal → one agent→user message', () => {
    const spec = specWith([node('n', 'terminal', 'turn ends')])
    const msgs = projectScenario(spec, scenario(['n']))
    expect(msgs).toHaveLength(1)
    expect(msgs[0]).toMatchObject({ from: 'agent', to: 'user', label: 'turn ends', kind: 'terminal' })
  })

  it('tool and decision nodes are dropped (no message)', () => {
    const spec = specWith([node('t', 'tool'), node('d', 'decision')])
    expect(projectScenario(spec, scenario(['t', 'd']))).toHaveLength(0)
  })

  it('skips step ids that are not present in spec.nodes', () => {
    const spec = specWith([node('n', 'input')])
    const msgs = projectScenario(spec, scenario(['missing', 'n', 'also-missing']))
    expect(msgs).toHaveLength(1)
    expect(msgs[0]).toMatchObject({ from: 'user', to: 'agent' })
  })

  it('preserves node note and sourceRef on emitted messages', () => {
    const spec = specWith([{ id: 'n', label: 'l', kind: 'input', note: 'a note', sourceRef: 'src/x.ts' }])
    const msgs = projectScenario(spec, scenario(['n']))
    expect(msgs[0]).toMatchObject({ note: 'a note', sourceRef: 'src/x.ts' })
  })

  it('returns empty array for an empty scenario', () => {
    expect(projectScenario(specWith([node('n', 'input')]), scenario([]))).toHaveLength(0)
  })

  it('emits messages in scenario.steps order', () => {
    const spec = specWith([node('a', 'input'), node('b', 'terminal')])
    const msgs = projectScenario(spec, scenario(['b', 'a']))
    expect(msgs.map((m) => m.kind)).toEqual(['terminal', 'input'])
  })
})

describe('projectScenario — real claude-code spec fixture', () => {
  const spec = claudeCode as unknown as LoopSpec
  const byId = (id: string) => spec.scenarios.find((s) => s.id === id)!

  it('plain-answer: input + llm(x2) + terminal = 4 messages', () => {
    const msgs = projectScenario(spec, byId('plain-answer'))
    // steps: user-input(input), llm, stop-check(decision→drop), done(terminal)
    expect(msgs).toHaveLength(4)
    expect(msgs.map((m) => m.kind)).toEqual(['input', 'llm', 'llm', 'terminal'])
  })

  it('edit-file: input + llm + approval + execute + llm + terminal = 9 messages', () => {
    const msgs = projectScenario(spec, byId('edit-file'))
    // dropped: stop-check(decision) x2, tool-dispatch(tool)
    expect(msgs).toHaveLength(9)
    expect(msgs.map((m) => m.kind)).toEqual([
      'input', 'llm', 'llm', 'approval', 'execute', 'execute', 'llm', 'llm', 'terminal',
    ])
  })

  it('denied-tool: approval present but no execute', () => {
    const msgs = projectScenario(spec, byId('denied-tool'))
    expect(msgs.some((m) => m.kind === 'approval')).toBe(true)
    expect(msgs.some((m) => m.kind === 'execute')).toBe(false)
  })

  it('multi-tool: two approval gates and two execute pairs', () => {
    const msgs = projectScenario(spec, byId('multi-tool'))
    expect(msgs.filter((m) => m.kind === 'approval')).toHaveLength(2)
    expect(msgs.filter((m) => m.kind === 'execute')).toHaveLength(4)
  })

  it('never emits a message for tool or decision kinds', () => {
    for (const s of spec.scenarios) {
      const msgs = projectScenario(spec, s)
      expect(msgs.some((m) => m.kind === 'tool' || m.kind === 'decision')).toBe(false)
    }
  })
})
