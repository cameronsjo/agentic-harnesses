import { useEffect, useMemo, useRef, useState } from 'react'
import { specs, sharedScenarios } from './data'
import { Anchored } from './Anchored'
import { LoopGraph, type ActiveEdge } from './LoopGraph'

const STEP_MS = 950

function edgeBetween(fromId?: string, toId?: string): ActiveEdge | null {
  return fromId && toId ? { from: fromId, to: toId } : null
}

/** The headline feature: every harness runs the SAME scenario, stepped in lockstep. */
export function ScenarioCompare() {
  const [scenarioId, setScenarioId] = useState(sharedScenarios[0]?.id ?? 'edit-file')
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)

  // The "turn complete" caption and the play→end latch (see the effects below).
  const captionRef = useRef<HTMLSpanElement>(null)
  const wasPlaying = useRef(false)

  // Per-harness resolved scenario for the current id.
  const columns = useMemo(
    () =>
      specs.map((spec) => ({
        spec,
        sc: spec.scenarios.find((s) => s.id === scenarioId) ?? spec.scenarios[0],
      })),
    [scenarioId],
  )

  const maxSteps = useMemo(() => Math.max(1, ...columns.map((c) => c.sc.steps.length)), [columns])

  useEffect(() => {
    setStep(0)
    setPlaying(false)
    wasPlaying.current = false
  }, [scenarioId])

  useEffect(() => {
    if (!playing) return
    if (step >= maxSteps - 1) {
      setPlaying(false)
      return
    }
    const t = setTimeout(() => setStep((s) => s + 1), STEP_MS)
    return () => clearTimeout(t)
  }, [playing, step, maxSteps])

  const atEnd = step >= maxSteps - 1

  // One whimsical operation for the whole comparison: every harness has reached
  // its terminal. Shimmer the caption once on the play→end edge — when the
  // global step first hits maxSteps-1 while playing — never on manual Step/Reset.
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
    <section className="compare">
      <div className="compare-controls">
        <div className="scenario-tabs cluster" role="tablist" aria-label="Scenario">
          {sharedScenarios.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={s.id === scenarioId}
              className={`btn btn--ghost tab ${s.id === scenarioId ? 'tab--active' : ''}`}
              onClick={() => setScenarioId(s.id)}
            >
              {s.id}
            </button>
          ))}
        </div>
        <div className="transport cluster">
          <button className="btn btn--secondary" onClick={() => setStep(0)} disabled={step === 0 && !playing}>
            Reset
          </button>
          <button className="btn" onClick={() => (atEnd ? (setStep(0), setPlaying(true)) : setPlaying((p) => !p))}>
            {playing ? 'Pause' : atEnd ? 'Replay' : 'Play all'}
          </button>
          <button
            className="btn btn--secondary"
            onClick={() => setStep((s) => Math.min(s + 1, maxSteps - 1))}
            disabled={atEnd}
          >
            Step ›
          </button>
          <span className="step-counter">
            step <b>{step + 1}</b> / {maxSteps}
            {atEnd && (
              <span className="turn-complete" ref={captionRef}>
                turn complete
              </span>
            )}
          </span>
        </div>
      </div>

      <p className="scenario-title">
        <Anchored text={sharedScenarios.find((s) => s.id === scenarioId)?.title ?? ''} />
      </p>

      <div className="compare-grid">
        {columns.map(({ spec, sc }) => {
          // Each harness clamps the global step to its own scenario length, then holds at its terminal.
          const local = Math.min(step, sc.steps.length - 1)
          const activeNodeId = sc.steps[local]
          const activeEdge = edgeBetween(sc.steps[local - 1], sc.steps[local])
          const node = spec.nodes.find((n) => n.id === activeNodeId)
          const done = step >= sc.steps.length - 1
          return (
            <div key={spec.harness} className={`card compare-col ${done ? 'compare-col--done' : ''}`}>
              <header className="compare-col-head">
                <b>{spec.displayName}</b>
                <span className="lang-badge">{spec.language}</span>
              </header>
              <div className="loop-style">{spec.loopStyle}</div>
              <LoopGraph spec={spec} activeNodeId={activeNodeId} activeEdge={activeEdge} />
              <div className="compare-caption">
                {node ? (
                  <>
                    <b>{node.label}</b>
                    {node.sourceRef && <code className="source-ref">{node.sourceRef}</code>}
                  </>
                ) : (
                  <span className="fg-secondary">—</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
