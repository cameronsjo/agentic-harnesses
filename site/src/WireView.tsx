import { useState } from 'react'
import wireData from './data/wire/claude-code.json'
import { usePlayerTimer } from './player'
import { TabPicker, TransportBar } from './controls'
import { CurlWalkthrough } from './CurlWalkthrough'

interface Part {
  id: string
  label: string
  kind: string
  cached?: boolean
  breakpoint?: boolean
  scope?: string
  note: string
  sourceRef?: string
}
interface Wire {
  request: Part[]
  response: Part[]
  caching: { ttl: string; breakpoints: string; references: string; sourceRef: string }
}

const wire = wireData as Wire

// Ordered timeline: assemble request top-to-bottom, then stream the response.
const timeline: { phase: 'request' | 'response'; part: Part }[] = [
  ...wire.request.map((part) => ({ phase: 'request' as const, part })),
  ...wire.response.map((part) => ({ phase: 'response' as const, part })),
]

const WIRE_MODES = [
  { id: 'curl', label: 'curl walkthrough' },
  { id: 'layers', label: 'request layers' },
]

/** Animated view of what Claude Code sends over the wire and what streams back. */
export function WireView() {
  const [mode, setMode] = useState<'curl' | 'layers'>('curl')

  return (
    <section className="wire-view">
      <TabPicker
        className="wire-mode"
        ariaLabel="Wire view mode"
        items={WIRE_MODES}
        active={mode}
        onSelect={(id) => setMode(id as 'curl' | 'layers')}
      />

      {mode === 'curl' ? <CurlWalkthrough /> : <LayersView />}
    </section>
  )
}

/**
 * The layered request/response assembly view. Owns its own timer so it only runs
 * while this mode is mounted — switching to the curl walkthrough and back starts fresh.
 * The timeline is requests-then-responses, so the revealed counts are pure arithmetic.
 */
function LayersView() {
  const player = usePlayerTimer(timeline.length)
  const { step } = player
  const active = timeline[step]
  const revealedReq = Math.min(step + 1, wire.request.length)
  const revealedResp = Math.max(0, step + 1 - wire.request.length)

  return (
    <>
      <p className="scenario-title">What Claude Code sends over the wire</p>
      <TransportBar player={player} playLabel="Assemble" total={timeline.length} counterLabel="step" />

      <div className="wire-body">
        <div className="wire-columns">
          <div className="wire-col">
            <header className="wire-col-head">POST /v1/messages — request</header>
            {wire.request.map((part, i) => {
              const revealed = i < revealedReq
              const isActive = active?.phase === 'request' && active.part.id === part.id
              if (part.kind === 'boundary') {
                return (
                  <div key={part.id} className={`wire-boundary ${revealed ? '' : 'wire-dim'}`}>
                    <span>{part.label}</span>
                  </div>
                )
              }
              return (
                <div
                  key={part.id}
                  className={`wire-block wire-${part.kind} ${revealed ? '' : 'wire-dim'} ${isActive ? 'wire-active' : ''}`}
                >
                  <span className="wire-label">{part.label}</span>
                  <span className="wire-tags">
                    {part.cached && <span className="badge badge--success">cached</span>}
                    {part.scope === 'global' && <span className="badge badge--accent">global</span>}
                    {part.breakpoint && <span className="cache-bp" title="cache breakpoint">⟐ breakpoint</span>}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="wire-col">
            <header className="wire-col-head">response — streamed</header>
            {wire.response.map((part, i) => {
              const revealed = i < revealedResp
              const isActive = active?.phase === 'response' && active.part.id === part.id
              return (
                <div
                  key={part.id}
                  className={`wire-block wire-${part.kind} ${revealed ? '' : 'wire-dim'} ${isActive ? 'wire-active' : ''}`}
                >
                  <span className="wire-label">{part.label}</span>
                </div>
              )
            })}
            <div className="wire-caching">
              <b>caching</b>
              <div>TTL — {wire.caching.ttl}</div>
              <div>breakpoints — {wire.caching.breakpoints}</div>
              <code className="source-ref">{wire.caching.sourceRef}</code>
            </div>
          </div>
        </div>

        <aside className="inspector">
          {active && (
            <div className="node-card">
              <div className="node-card-head">
                <b>{active.part.label}</b>
              </div>
              <div className="node-kind">{active.phase}</div>
              {active.part.sourceRef && <code className="source-ref">{active.part.sourceRef}</code>}
              <p className="node-note">{active.part.note}</p>
            </div>
          )}
        </aside>
      </div>
    </>
  )
}
