import { useMemo, useState } from 'react'
import { specs, sharedScenarios } from './data'
import { KIND_COLOR } from './types'
import { usePlayerTimer } from './player'
import { PARTICIPANTS, projectScenario, type Participant } from './sequence'

const MARGIN = 70
const LANE_GAP = 180
const HEAD_Y = 14
const HEAD_H = 34
const TOP = HEAD_H + 40
const ROW_H = 54
const WIDTH = MARGIN * 2 + (PARTICIPANTS.length - 1) * LANE_GAP

const laneX = (p: Participant) => MARGIN + PARTICIPANTS.findIndex((x) => x.id === p) * LANE_GAP

/** A message-passing-over-time view of a loop scenario: lifelines + animated arrows. */
export function SequenceView() {
  const [harness, setHarness] = useState(specs[0]?.harness ?? '')
  const [scenarioId, setScenarioId] = useState(sharedScenarios[0]?.id ?? 'edit-file')

  const spec = specs.find((s) => s.harness === harness) ?? specs[0]
  const messages = useMemo(() => {
    const sc = spec?.scenarios.find((s) => s.id === scenarioId) ?? spec?.scenarios[0]
    return spec && sc ? projectScenario(spec, sc) : []
  }, [spec, scenarioId])

  const { step, playing, atEnd, toggle, stepForward, reset } = usePlayerTimer(
    messages.length,
    `${harness}:${scenarioId}`,
  )

  if (!spec) return <p className="empty">No specs.</p>

  const active = messages[step]
  const height = TOP + messages.length * ROW_H + 20

  return (
    <section className="seq-view">
      <div className="compare-controls">
        <div className="cluster" style={{ gap: 'var(--s-md)', flexWrap: 'wrap' }}>
          <div className="scenario-tabs cluster" role="group" aria-label="Harness">
            {specs.map((s) => (
              <button
                key={s.harness}
                type="button"
                aria-pressed={s.harness === spec.harness}
                className={`btn btn--ghost tab ${s.harness === spec.harness ? 'tab--active' : ''}`}
                onClick={() => setHarness(s.harness)}
              >
                {s.displayName}
              </button>
            ))}
          </div>
          <div className="scenario-tabs cluster" role="group" aria-label="Scenario">
            {sharedScenarios.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={s.id === scenarioId}
                className={`btn btn--ghost tab ${s.id === scenarioId ? 'tab--active' : ''}`}
                onClick={() => setScenarioId(s.id)}
              >
                {s.id}
              </button>
            ))}
          </div>
        </div>
        <div className="transport cluster">
          <button className="btn btn--secondary" onClick={reset} disabled={step === 0 && !playing}>
            Reset
          </button>
          <button className="btn" onClick={toggle}>
            {playing ? 'Pause' : atEnd ? 'Replay' : 'Play'}
          </button>
          <button className="btn btn--secondary" onClick={stepForward} disabled={atEnd}>
            Step ›
          </button>
          <span className="step-counter">
            msg <b>{step + 1}</b> / {messages.length}
          </span>
        </div>
      </div>

      <div className="seq-body">
        <div className="graph-pane">
          <svg viewBox={`0 0 ${WIDTH} ${height}`} width={WIDTH} height={height} role="img" aria-label="sequence diagram">
            <defs>
              <marker id="seq-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-bright)" />
              </marker>
              <marker id="seq-arrow-dim" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--dia-edge)" />
              </marker>
            </defs>

            {/* participant headers + lifelines */}
            {PARTICIPANTS.map((p) => {
              const x = laneX(p.id)
              const lit = active && (active.from === p.id || active.to === p.id)
              return (
                <g key={p.id}>
                  <line x1={x} y1={HEAD_Y + HEAD_H} x2={x} y2={height} stroke="var(--dia-rail)" strokeWidth="1" strokeDasharray="3 4" />
                  <rect x={x - 60} y={HEAD_Y} width={120} height={HEAD_H} rx={8} fill={lit ? 'var(--bg-overlay)' : 'var(--dia-node-bg)'} stroke={lit ? 'var(--accent-bright)' : 'var(--dia-node-border)'} strokeWidth={lit ? 2 : 1.5} />
                  <text x={x} y={HEAD_Y + HEAD_H / 2} fill="var(--dia-node-fg)" fontSize="12" fontFamily="var(--font-mono)" textAnchor="middle" dominantBaseline="central">
                    {p.label}
                  </text>
                </g>
              )
            })}

            {/* messages, revealed up to the current step */}
            {messages.slice(0, step + 1).map((m, i) => {
              const y = TOP + i * ROW_H
              const isActive = i === step
              const color = isActive ? 'var(--accent-bright)' : 'var(--dia-edge)'
              const marker = isActive ? 'url(#seq-arrow)' : 'url(#seq-arrow-dim)'
              const kindColor = KIND_COLOR[m.kind]

              if (m.self) {
                const x = laneX(m.from)
                return (
                  <g key={m.id} opacity={isActive ? 1 : 0.55}>
                    <path d={`M ${x} ${y} h 34 v 18 h -30`} fill="none" stroke={color} strokeWidth={isActive ? 2.5 : 1.5} markerEnd={marker} />
                    <rect x={x + 6} y={y - 5} width={4} height={4} fill={kindColor} />
                    <text x={x + 42} y={y + 4} fill={isActive ? 'var(--fg)' : 'var(--fg-secondary)'} fontSize="11" fontFamily="var(--font-mono)">
                      {m.label}
                    </text>
                  </g>
                )
              }

              const x1 = laneX(m.from)
              const x2 = laneX(m.to)
              const midX = (x1 + x2) / 2
              return (
                <g key={m.id} opacity={isActive ? 1 : 0.55}>
                  <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth={isActive ? 2.5 : 1.5} strokeDasharray={m.return ? '5 4' : undefined} markerEnd={marker} />
                  <rect x={midX - 3} y={y - 14} width={6} height={6} rx={1} fill={kindColor} />
                  <text x={midX} y={y - 6} fill={isActive ? 'var(--fg)' : 'var(--fg-secondary)'} fontSize="11" fontFamily="var(--font-mono)" textAnchor="middle">
                    {m.label}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        <aside className="inspector">
          <div className="harness-meta" style={{ margin: 0 }}>
            <span className="lang-badge">{spec.language}</span>
            <span className="loop-style">{spec.loopStyle}</span>
          </div>
          {active && (
            <div className="node-card">
              <div className="node-card-head">
                <b>
                  {active.from} → {active.to}
                </b>
              </div>
              <div className="node-kind">{active.label}</div>
              {active.sourceRef && <code className="source-ref">{active.sourceRef}</code>}
              {active.note && <p className="node-note">{active.note}</p>}
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}
