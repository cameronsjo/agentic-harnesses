import { useMemo, useState } from 'react'
import { specByHarness } from './data'
import { LoopGraph } from './LoopGraph'
import { GraphModal } from './GraphModal'
import hooksData from './data/hooks/claude-code-events.json'

interface HookEvent {
  event: string
  firesAt: string
  position: string
  when: string
  controls: string[]
  blocking: boolean
  sourceRef: string
}

const events = (hooksData as { events: HookEvent[] }).events

/** Claude Code's lifecycle hooks overlaid on its agent loop — click a node to see what fires there. */
export function HooksView() {
  const spec = specByHarness('claude-code')
  const [selected, setSelected] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const badges = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const e of events) counts[e.firesAt] = (counts[e.firesAt] ?? 0) + 1
    return counts
  }, [])

  if (!spec) return <p className="empty">claude-code loop spec not found.</p>

  const shown = selected ? events.filter((e) => e.firesAt === selected) : events
  const selectedLabel = selected ? spec.nodes.find((n) => n.id === selected)?.label : null

  // Reused inline and in the expand modal — the annotated loop and the event list.
  const graph = (
    <LoopGraph
      spec={spec}
      badges={badges}
      onNodeClick={(id) => setSelected((cur) => (cur === id ? null : id))}
      activeNodeId={selected ?? undefined}
    />
  )
  const eventList = (
    <aside className="hooks-list">
      <div className="hooks-list-head">
        {selected ? (
          <>
            <b>{selectedLabel}</b>
            <button className="btn btn--ghost tab" onClick={() => setSelected(null)}>
              clear ✕
            </button>
          </>
        ) : (
          <b>All events ({events.length})</b>
        )}
      </div>

      <ul className="event-list">
        {shown.map((e) => (
          <li key={e.event} className="event-item">
            <div className="event-head">
              <b>{e.event}</b>
              {e.blocking ? (
                <span className="badge badge--urgent">blocking</span>
              ) : (
                <span className="badge badge--ghost">observe</span>
              )}
            </div>
            <div className="event-when">{e.when}</div>
            <div className="event-controls">
              {e.controls.map((c) => (
                <span key={c} className="control-chip">
                  {c}
                </span>
              ))}
            </div>
            <code className="source-ref">{e.sourceRef}</code>
          </li>
        ))}
      </ul>
    </aside>
  )

  return (
    <section className="hooks-view">
      <p className="scenario-title">
        Where Claude Code&rsquo;s <b>hooks</b> fire on its loop
      </p>
      <p className="hooks-hint">
        Each badge counts the lifecycle events that fire at that node. Click a node to filter; click again
        to clear. <code>PreToolUse</code> fires at the approval gate — before <code>canUseTool</code>.
      </p>

      <div className="hooks-body">
        <div className="graph-pane">
          <button
            type="button"
            className="btn btn--secondary graph-expand"
            onClick={() => setExpanded(true)}
          >
            <span aria-hidden="true">⤢</span> Expand
          </button>
          {graph}
        </div>

        {eventList}
      </div>

      <GraphModal open={expanded} onClose={() => setExpanded(false)} title={spec.displayName}>
        <div className="graph-modal__layout">
          <div className="graph-modal__diagram">{graph}</div>
          <div className="graph-modal__side">{eventList}</div>
        </div>
      </GraphModal>
    </section>
  )
}
