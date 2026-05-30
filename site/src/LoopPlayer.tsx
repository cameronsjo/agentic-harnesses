import { useEffect, useRef, useState } from 'react'
import type { LoopSpec } from './types'
import { KIND_LABEL } from './types'
import { scenario } from './data'
import { Anchored } from './Anchored'
import { LoopGraph, type ActiveEdge } from './LoopGraph'

const STEP_MS = 950

function edgeBetween(fromId?: string, toId?: string): ActiveEdge | null {
  return fromId && toId ? { from: fromId, to: toId } : null
}

interface Props {
  spec: LoopSpec
  scenarioId: string
  onScenarioChange?: (id: string) => void
}

/** Single-harness player: scenario tabs + transport controls + the live node inspector. */
export function LoopPlayer({ spec, scenarioId, onScenarioChange }: Props) {
  const sc = scenario(spec, scenarioId) ?? spec.scenarios[0]
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)

  // Reset to the start whenever the scenario or harness changes.
  useEffect(() => {
    setStep(0)
    setPlaying(false)
    wasPlaying.current = false
  }, [scenarioId, spec.harness])

  useEffect(() => {
    if (!playing) return
    if (step >= sc.steps.length - 1) {
      setPlaying(false)
      return
    }
    const t = setTimeout(() => setStep((s) => s + 1), STEP_MS)
    return () => clearTimeout(t)
  }, [playing, step, sc.steps.length])

  const activeNodeId = sc.steps[step]
  const activeEdge = edgeBetween(sc.steps[step - 1], sc.steps[step])
  const node = spec.nodes.find((n) => n.id === activeNodeId)
  const atEnd = step >= sc.steps.length - 1

  // The one whimsical operation: reaching the terminal node IS the turn ending.
  // Shimmer the caption once, but only when playback drove us to the end — not
  // on a manual Step/Reset. wasPlaying latches while playing so the play→end
  // edge can be told apart from a manual arrival.
  const captionRef = useRef<HTMLSpanElement>(null)
  const wasPlaying = useRef(false)
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
      <div className="scenario-tabs cluster" role="tablist" aria-label="Scenarios">
        {spec.scenarios.map((s) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={s.id === scenarioId}
            className={`btn btn--ghost tab ${s.id === scenarioId ? 'tab--active' : ''}`}
            onClick={() => onScenarioChange?.(s.id)}
          >
            {s.id}
          </button>
        ))}
      </div>

      <p className="scenario-title">
        <Anchored text={sc.title} />
      </p>

      <div className="player-body">
        <div className="card graph-pane">
          <LoopGraph spec={spec} activeNodeId={activeNodeId} activeEdge={activeEdge} />
        </div>

        <aside className="inspector">
          <div className="transport cluster">
            <button className="btn btn--secondary" onClick={() => setStep(0)} disabled={step === 0 && !playing}>
              Reset
            </button>
            <button
              className="btn"
              onClick={() => (atEnd ? (setStep(0), setPlaying(true)) : setPlaying((p) => !p))}
            >
              {playing ? 'Pause' : atEnd ? 'Replay' : 'Play'}
            </button>
            <button
              className="btn btn--secondary"
              onClick={() => setStep((s) => Math.min(s + 1, sc.steps.length - 1))}
              disabled={atEnd}
            >
              Step ›
            </button>
          </div>

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
