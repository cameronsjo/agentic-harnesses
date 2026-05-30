import { useEffect, useRef } from 'react'
import data from './data/wire/curl-walkthrough.json'
import { usePlayerTimer } from './player'
import { TransportBar } from './controls'

interface Line {
  kind: string
  text: string
  ref?: string
  annotation?: string
}

const lines = (data as { lines: Line[] }).lines

/** A hand-run of the loop as raw curl calls — step through the request/response round-trips. */
export function CurlWalkthrough() {
  const player = usePlayerTimer(lines.length)
  const { step } = player
  const activeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [step])

  return (
    <div className="curl">
      <TransportBar player={player} playLabel="Run ▸" total={lines.length} counterLabel="line" />

      <div className="terminal" role="log" aria-live="polite">
        <div className="terminal-bar">
          <span className="term-dot" />
          <span className="term-dot" />
          <span className="term-dot" />
          <span className="term-title">claude-code · /v1/messages</span>
        </div>
        <div className="terminal-body">
          {lines.slice(0, step + 1).map((ln, i) => {
            const active = i === step
            return (
              <div
                key={i}
                ref={active ? activeRef : undefined}
                className={`tline tline--${ln.kind} ${active ? 'tline--active' : ''}`}
              >
                <pre className="tline-text">
                  {ln.text}
                  {active && <span className="tcursor">▋</span>}
                </pre>
                {ln.annotation && <div className="tline-annot">↳ {ln.annotation}</div>}
                {ln.ref && <code className="source-ref tline-ref">{ln.ref}</code>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
