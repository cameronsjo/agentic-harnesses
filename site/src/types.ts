export type NodeKind =
  | 'input'
  | 'llm'
  | 'tool'
  | 'approval'
  | 'execute'
  | 'decision'
  | 'terminal'

export interface LoopNode {
  id: string
  label: string
  kind: NodeKind
  sourceRef?: string
  note?: string
}

export interface LoopEdge {
  from: string
  to: string
  on?: string
  label?: string
}

export interface Scenario {
  id: string
  title: string
  steps: string[]
  note?: string
}

export interface LoopSpec {
  harness: string
  displayName: string
  language: string
  repo?: string
  version?: string
  loopStyle: string
  entrypoint?: string
  nodes: LoopNode[]
  edges: LoopEdge[]
  scenarios: Scenario[]
}

// Node kind → Artificer semantic token. Categorical, but restrained to the system palette.
export const KIND_COLOR: Record<NodeKind, string> = {
  input: 'var(--steel)',
  llm: 'var(--accent)',
  tool: 'var(--attention)',
  approval: 'var(--urgent)',
  execute: 'var(--success)',
  decision: 'var(--accent-bright)',
  terminal: 'var(--fg-disabled)',
}

export const KIND_LABEL: Record<NodeKind, string> = {
  input: 'user input',
  llm: 'model call',
  tool: 'tool dispatch',
  approval: 'approval gate',
  execute: 'execute',
  decision: 'decision',
  terminal: 'turn ends',
}

// Canonical scenario order, shared across all harnesses.
export const SCENARIO_ORDER = ['plain-answer', 'edit-file', 'denied-tool', 'multi-tool']
