import { useEffect, useMemo, useRef, useState } from 'react'
import { specs, sharedScenarios } from './data'
import { Anchored } from './Anchored'
import { LoopGraph } from './LoopGraph'
import { edgeBetween, usePlayerTimer } from './player'
import { TabPicker, TransportBar } from './controls'

/** The headline feature: every harness runs the SAME scenario, stepped in lockstep. */
export function ScenarioCompare() {
  const [scenarioId, setScenarioId] = useState(sharedScenarios[0]?.id ?? 'edit-file')

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
  const player = usePlayerTimer(maxSteps, scenarioId)
  const { step, playing, atEnd } = player

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
        <TabPicker
          ariaLabel="Scenario"
          items={sharedScenarios.map((s) => ({ id: s.id, label: s.id }))}
          active={scenarioId}
          onSelect={setScenarioId}
        />
        <TransportBar player={player} playLabel="Play all" total={maxSteps} counterLabel="step" />
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
