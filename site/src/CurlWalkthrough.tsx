import { useEffect, useRef } from 'react'
import data from './data/wire/curl-walkthrough.json'
import { usePlayerTimer } from './player'

interface Line {
  kind: string
  text: string
  ref?: string
  annotation?: string
}

const lines = (data as { lines: Line[] }).lines

/** A hand-run of the loop as raw curl calls — step through the request/response round-trips. */
export function CurlWalkthrough() {
  const { step, playing, atEnd, toggle, stepForward, reset } = usePlayerTimer(lines.length)
  const activeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [step])

  return (
    <div className="curl">
      <div className="transport cluster">
        <button className="btn btn--secondary" onClick={reset} disabled={step === 0 && !playing}>
          Reset
        </button>
        <button className="btn" onClick={toggle}>
          {playing ? 'Pause' : atEnd ? 'Replay' : 'Run ▸'}
        </button>
        <button className="btn btn--secondary" onClick={stepForward} disabled={atEnd}>
          Step ›
        </button>
        <span className="step-counter">
          line <b>{step + 1}</b> / {lines.length}
        </span>
      </div>

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
