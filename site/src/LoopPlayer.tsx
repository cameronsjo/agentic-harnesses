import { useEffect, useRef } from 'react'
import type { LoopSpec } from './types'
import { KIND_LABEL } from './types'
import { scenario } from './data'
import { Anchored } from './Anchored'
import { LoopGraph } from './LoopGraph'
import { edgeBetween, usePlayerTimer } from './player'
import { TabPicker, TransportBar } from './controls'

interface Props {
  spec: LoopSpec
  scenarioId: string
  onScenarioChange?: (id: string) => void
}

/** Single-harness player: scenario tabs + transport controls + the live node inspector. */
export function LoopPlayer({ spec, scenarioId, onScenarioChange }: Props) {
  const sc = scenario(spec, scenarioId) ?? spec.scenarios[0]
  const player = usePlayerTimer(sc.steps.length, `${spec.harness}:${scenarioId}`)
  const { step, playing, atEnd } = player

  // The "turn complete" caption and the play→end latch (see the effects below).
  const captionRef = useRef<HTMLSpanElement>(null)
  const wasPlaying = useRef(false)

  const activeNodeId = sc.steps[step]
  const activeEdge = edgeBetween(sc.steps[step - 1], sc.steps[step])
  const node = spec.nodes.find((n) => n.id === activeNodeId)

  // The one whimsical operation: reaching the terminal node IS the turn ending.
  // Shimmer the caption once, but only when playback drove us to the end — not
  // on a manual Step/Reset. wasPlaying latches while playing so the play→end
  // edge can be told apart from a manual arrival.
  useEffect(() => {
    if (playing) wasPlaying.current = true
  }, [playing])
  useEffect(() => {
    if (atEnd && wasPlaying.current) {
      wasPlaying.current = false
      window.Whimsy?.celebrate(captionRef.current, 2200)
    }
  }, [atEnd])

  return (
    <div className="player">
      <TabPicker
        ariaLabel="Scenarios"
        items={spec.scenarios.map((s) => ({ id: s.id, label: s.id }))}
        active={scenarioId}
        onSelect={(id) => onScenarioChange?.(id)}
      />

      <p className="scenario-title">
        <Anchored text={sc.title} />
      </p>

      <div className="player-body">
        <div className="card graph-pane">
          <LoopGraph spec={spec} activeNodeId={activeNodeId} activeEdge={activeEdge} />
        </div>

        <aside className="inspector">
          <TransportBar player={player} playLabel="Play" />

          <div className="step-counter">
            step <b>{step + 1}</b> / {sc.steps.length}
            {atEnd && (
              <span className="turn-complete" ref={captionRef}>
                turn complete
              </span>
            )}
          </div>

          {node && (
            <div className="card card--active node-card">
              <div className="node-card-head">
                <span className={`dot dot--${dotFor(node.kind)}`} />
                <b>{node.label}</b>
              </div>
              <div className="node-kind">{KIND_LABEL[node.kind]}</div>
              {node.sourceRef && <code className="source-ref">{node.sourceRef}</code>}
              {node.note && (
                <p className="node-note">
                  <Anchored text={node.note} />
                </p>
              )}
            </div>
          )}

          {sc.note && (
            <p className="scenario-note">
              <Anchored text={sc.note} />
            </p>
          )}
        </aside>
      </div>
    </div>
  )
}

// Map node kinds onto the Artificer status-dot variants that exist in the CSS.
function dotFor(kind: string): string {
  switch (kind) {
    case 'approval':
      return 'urgent'
    case 'tool':
      return 'attention'
    case 'execute':
      return 'success'
    default:
      return 'accent'
  }
}
