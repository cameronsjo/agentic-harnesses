import type { LoopSpec, NodeKind, Scenario } from './types'

export type Participant = 'user' | 'agent' | 'model' | 'tool'

export const PARTICIPANTS: { id: Participant; label: string }[] = [
  { id: 'user', label: 'User' },
  { id: 'agent', label: 'Agent loop' },
  { id: 'model', label: 'Model API' },
  { id: 'tool', label: 'Tool' },
]

export interface SeqMessage {
  id: number
  from: Participant
  to: Participant
  label: string
  kind: NodeKind
  self: boolean
  return: boolean
  note?: string
  sourceRef?: string
}

/**
 * Project a loop scenario into a sequence of messages between participants.
 * The same loop spec that drives the graph view drives this — one node kind
 * maps to one or two arrows, so each harness's scenario yields its own diagram.
 */
export function projectScenario(spec: LoopSpec, scenario: Scenario): SeqMessage[] {
  const msgs: SeqMessage[] = []
  let id = 0
  const push = (
    from: Participant,
    to: Participant,
    label: string,
    kind: NodeKind,
    extra: { self?: boolean; return?: boolean; note?: string; sourceRef?: string } = {},
  ) => {
    msgs.push({ id: id++, from, to, label, kind, self: extra.self ?? false, return: extra.return ?? false, note: extra.note, sourceRef: extra.sourceRef })
  }

  for (const stepId of scenario.steps) {
    const node = spec.nodes.find((n) => n.id === stepId)
    if (!node) continue
    const meta = { note: node.note, sourceRef: node.sourceRef }
    switch (node.kind) {
      case 'input':
        push('user', 'agent', node.label, node.kind, meta)
        break
      case 'llm':
        push('agent', 'model', 'request', node.kind, meta)
        push('model', 'agent', 'assistant response', node.kind, { ...meta, return: true })
        break
      case 'approval':
        push('agent', 'agent', node.label, node.kind, { ...meta, self: true })
        break
      case 'execute':
        push('agent', 'tool', 'execute', node.kind, meta)
        push('tool', 'agent', 'result', node.kind, { ...meta, return: true })
        break
      case 'terminal':
        push('agent', 'user', node.label, node.kind, meta)
        break
      // 'tool' (dispatch) and 'decision' (branch) are internal to the agent —
      // they don't cross a lifeline, so they're folded into the surrounding arrows.
      default:
        break
    }
  }
  return msgs
}
