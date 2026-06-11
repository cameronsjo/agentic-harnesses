import { useMemo, useState } from 'react'
import { sharedScenarios } from './data'
import type { LoopSpec } from './types'
import { usePlayerTimer } from './player'
import { ExpandButton, TabPicker, TransportBar } from './controls'
import { GraphModal } from './GraphModal'
import { PARTICIPANTS, projectScenario, type Participant } from './sequence'

const MARGIN = 70
const LANE_GAP = 180
const HEAD_Y = 14
const HEAD_H = 34
const TOP = HEAD_H + 40
const ROW_H = 54
const WIDTH = MARGIN * 2 + (PARTICIPANTS.length - 1) * LANE_GAP

// Lane x-positions are fixed by participant order — resolve once, not per render.
const LANE_X = Object.fromEntries(
  PARTICIPANTS.map((p, i) => [p.id, MARGIN + i * LANE_GAP]),
) as Record<Participant, number>
const laneX = (p: Participant) => LANE_X[p]

interface Props {
  spec: LoopSpec
  scenarioId: string
  onScenarioChange: (id: string) => void
}

/** A message-passing-over-time view of a loop scenario: lifelines + animated arrows. */
export function SequenceView({ spec, scenarioId, onScenarioChange }: Props) {
  const messages = useMemo(() => {
    const sc = spec?.scenarios.find((s) => s.id === scenarioId) ?? spec?.scenarios[0]
    return spec && sc ? projectScenario(spec, sc) : []
  }, [spec, scenarioId])

  // Floor at 1 so a scenario that projects to no messages can't underflow the timer
  // (mirrors ScenarioCompare's maxSteps guard). active stays undefined and renders nothing.
  const player = usePlayerTimer(Math.max(1, messages.length), `${spec?.harness}:${scenarioId}`)
  const { step } = player
  const [expanded, setExpanded] = useState(false)

  if (!spec) return <p className="empty">No specs.</p>

  const active = messages[step]
  const height = TOP + messages.length * ROW_H + 20
  // Namespace the SVG markers per diagram, matching LoopGraph's url(#id) collision guard.
  const mid = `${spec.harness}-${scenarioId}`

  // Reused inline and in the expand modal — the lifeline diagram and the message inspector.
  const diagram = (
    <svg viewBox={`0 0 ${WIDTH} ${height}`} width={WIDTH} height={height} role="img" aria-label="sequence diagram">
            <defs>
              <marker id={`seq-arrow-${mid}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-bright)" />
              </marker>
              <marker id={`seq-arrow-dim-${mid}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--dia-edge)" />
              </marker>
            </defs>

            {/* participant headers + lifelines */}
            {PARTICIPANTS.map((p) => {
              const x = laneX(p.id)
              const lit = active && (active.from === p.id || active.to === p.id)
              return (
                <g key={p.id}>
                  {/* Lifeline uses --dia-rail again: upstream re-tuned the token
                      from "--border at 50% opacity" (invisible, the reason for
                      adaptation #96's --dia-node-border substitution) to
                      --border-lifted, which now stands visible on the dark canvas. */}
                  <line x1={x} y1={HEAD_Y + HEAD_H} x2={x} y2={height} stroke="var(--dia-rail)" strokeWidth="1.5" strokeDasharray="4 5" />
                  <rect x={x - 60} y={HEAD_Y} width={120} height={HEAD_H} rx={8} fill={lit ? 'var(--bg-overlay)' : 'var(--dia-node-bg)'} stroke={lit ? 'var(--accent-bright)' : 'var(--dia-node-border)'} strokeWidth={lit ? 2 : 1.5} />
                  <text x={x} y={HEAD_Y + HEAD_H / 2} fill="var(--dia-node-fg)" fontSize="var(--t-label-sm-size)" fontFamily="var(--font-mono)" textAnchor="middle" dominantBaseline="central">
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
              const marker = isActive ? `url(#seq-arrow-${mid})` : `url(#seq-arrow-dim-${mid})`

              if (m.self) {
                const x = laneX(m.from)
                return (
                  <g key={i} opacity={isActive ? 1 : 0.55}>
                    <path d={`M ${x} ${y} h 34 v 18 h -30`} fill="none" stroke={color} strokeWidth={isActive ? 2.5 : 1.5} markerEnd={marker} />
                    <text x={x + 42} y={y + 4} fill={isActive ? 'var(--fg)' : 'var(--fg-secondary)'} fontSize="var(--t-label-xs-size)" fontFamily="var(--font-mono)">
                      {m.label}
                    </text>
                  </g>
                )
              }

              const x1 = laneX(m.from)
              const x2 = laneX(m.to)
              const midX = (x1 + x2) / 2
              return (
                <g key={i} opacity={isActive ? 1 : 0.55}>
                  <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth={isActive ? 2.5 : 1.5} strokeDasharray={m.return ? '5 4' : undefined} markerEnd={marker} />
                  <text x={midX} y={y - 6} fill={isActive ? 'var(--fg)' : 'var(--fg-secondary)'} fontSize="var(--t-label-xs-size)" fontFamily="var(--font-mono)" textAnchor="middle">
                    {m.label}
                  </text>
                </g>
              )
            })}
    </svg>
  )

  // Scenario picker + transport, shared by the inline controls bar and the modal side.
  const controls = (
    <>
      <TabPicker
        ariaLabel="Scenario"
        items={sharedScenarios.map((s) => ({ id: s.id, label: s.id }))}
        active={scenarioId}
        onSelect={onScenarioChange}
      />
      <TransportBar player={player} playLabel="Play" total={messages.length} counterLabel="msg" />
    </>
  )

  const messageCard = active && (
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
  )

  return (
    <section className="seq-view">
      <div className="compare-controls">{controls}</div>

      <div className="seq-body">
        <div className="card graph-pane">
          <ExpandButton onClick={() => setExpanded(true)} />
          {diagram}
        </div>

        <aside className="inspector">
          <div className="harness-meta" style={{ margin: 0 }}>
            <span className="lang-badge">{spec.language}</span>
            <span className="loop-style">{spec.loopStyle}</span>
          </div>
          {messageCard}
        </aside>
      </div>

      <GraphModal
        open={expanded}
        onClose={() => setExpanded(false)}
        title={spec.displayName}
        diagram={diagram}
        side={
          <>
            {controls}
            {messageCard}
          </>
        }
      />
    </section>
  )
}
