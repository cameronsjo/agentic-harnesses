import { useMemo } from 'react'
import type { LoopEdge, LoopSpec } from './types'
import { KIND_COLOR } from './types'

const NODE_W = 200
const NODE_H = 40
const ROW_H = 74
const TOP = 16

// Loopback geometry. Non-adjacent edges arc out into a side gutter; when several
// share a side they fan into separate lanes so the curves (and their labels)
// don't stack on top of each other or collide with the node boxes.
const LANE_BASE = 48 // control-point distance of the first arc beyond the node edge
const LANE_STEP = 42 // extra distance for each additional concurrent arc on that side
const LABEL_ROOM = 30 // room past the arc apex for its label to sit in the gutter
const MIN_SIDE = 20 // gutter when a side carries no arcs
// A same-side arc's cubic control points both sit at ctrlX, so the curve's
// horizontal apex (t=0.5) reaches only ~0.75·ctrlDist beyond the node edge — not
// the full control distance. Sizing the gutter to the apex (not ctrlDist) keeps
// the frame tight, so centered diagrams don't read as "zoomed out". See
// docs/diagram-layout.md.
const APEX_FRAC = 0.75

export interface ActiveEdge {
  from: string
  to: string
}

interface Props {
  spec: LoopSpec
  activeNodeId?: string
  activeEdge?: ActiveEdge | null
  /** Optional count badge per node id (e.g. number of hooks that fire there). */
  badges?: Record<string, number>
  /** When set, nodes become clickable. */
  onNodeClick?: (id: string) => void
}

/** Pure renderer: a harness loop as a vertical column of nodes with curved edges. */
export function LoopGraph({ spec, activeNodeId, activeEdge, badges, onNodeClick }: Props) {
  const rowOf = useMemo(() => {
    const m = new Map<string, number>()
    spec.nodes.forEach((n, i) => m.set(n.id, i))
    return m
  }, [spec])

  // Assign each non-adjacent edge a lane on its side (right = forward, left = backward),
  // then size each gutter to hold its widest lane plus room for the label.
  // Lanes are ordered by row-span, not edge-declaration order: the shortest arc
  // hugs the nodes (inner lane) and the longest rides the outer lane, so arcs nest
  // concentrically instead of a long arc cutting across short ones and tangling
  // their labels (the crowding seen on the denser harness graphs).
  const { laneOf, leftPad, rightPad } = useMemo(() => {
    const right: { i: number; span: number }[] = []
    const left: { i: number; span: number }[] = []
    spec.edges.forEach((e, i) => {
      const fr = rowOf.get(e.from)
      const tr = rowOf.get(e.to)
      if (fr == null || tr == null || tr === fr + 1) return
      ;(tr > fr ? right : left).push({ i, span: Math.abs(tr - fr) })
    })
    const laneOf = new Map<number, number>()
    for (const side of [right, left]) {
      // Stable sort: shortest span → lane 0 (innermost); ties keep declaration order.
      side.sort((a, b) => a.span - b.span).forEach((e, lane) => laneOf.set(e.i, lane))
    }
    const sidePad = (count: number) => {
      if (count === 0) return MIN_SIDE
      const ctrlOuter = LANE_BASE + (count - 1) * LANE_STEP // outermost lane's control distance
      return Math.round(APEX_FRAC * ctrlOuter) + LABEL_ROOM
    }
    return { laneOf, leftPad: sidePad(left.length), rightPad: sidePad(right.length) }
  }, [spec, rowOf])

  // Node column geometry. nodeX/arcs keep their tuned positions; the frame is
  // what centers. Left gutter holds backward arcs, right gutter forward arcs —
  // they're rarely equal, so a naive `leftPad + NODE_W + rightPad` viewBox leaves
  // the node column off-center once the SVG is centered in its container. Instead
  // we frame symmetrically about the node center: pad both sides to the WIDER
  // gutter. The lighter side just gains empty gutter; the boxes land dead-center.
  const nodeX = leftPad
  const centerX = nodeX + NODE_W / 2
  const sideMax = Math.max(leftPad, rightPad)
  const viewMinX = leftPad - sideMax // ≤ 0; shifts the frame so centerX is its middle
  const width = NODE_W + 2 * sideMax
  const yTop = (row: number) => TOP + row * ROW_H
  const yMid = (row: number) => yTop(row) + NODE_H / 2
  const height = TOP + spec.nodes.length * ROW_H

  // Unique marker ids per harness — four graphs render at once in Compare view,
  // and SVG ids are document-scoped, so shared ids would all resolve to the first.
  const arrowId = `arrow-${spec.harness}`
  const arrowActiveId = `arrow-active-${spec.harness}`

  const edgePath = (e: LoopEdge, idx: number): { d: string; mx: number; my: number } | null => {
    const fr = rowOf.get(e.from)
    const tr = rowOf.get(e.to)
    if (fr == null || tr == null) return null

    // Forward & adjacent → straight vertical segment between the boxes.
    if (tr === fr + 1) {
      const y1 = yTop(fr) + NODE_H
      const y2 = yTop(tr)
      return { d: `M ${centerX} ${y1} L ${centerX} ${y2}`, mx: centerX, my: (y1 + y2) / 2 }
    }

    const forward = tr > fr
    const lane = laneOf.get(idx) ?? 0
    const ctrlDist = LANE_BASE + lane * LANE_STEP
    // Forward non-adjacent → arc on the right; backward → arc on the left.
    const edgeX = forward ? nodeX + NODE_W : nodeX
    const ctrlX = forward ? edgeX + ctrlDist : edgeX - ctrlDist
    const y1 = yMid(fr)
    const y2 = yMid(tr)
    // Label rides the curve's apex (x at t=0.5 is ¼·edge + ¾·ctrl), out in the gutter.
    const apexX = 0.25 * edgeX + 0.75 * ctrlX
    return {
      d: `M ${edgeX} ${y1} C ${ctrlX} ${y1}, ${ctrlX} ${y2}, ${edgeX} ${y2}`,
      mx: apexX,
      my: (y1 + y2) / 2,
    }
  }

  const isActiveEdge = (e: LoopEdge) =>
    activeEdge != null && activeEdge.from === e.from && activeEdge.to === e.to

  return (
    <svg
      viewBox={`${viewMinX} 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={`${spec.displayName} loop graph`}
    >
      <defs>
        <marker id={arrowId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--dia-edge-strong)" />
        </marker>
        <marker id={arrowActiveId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-bright)" />
        </marker>
      </defs>

      {/* edges first, under the nodes */}
      {spec.edges.map((e, i) => {
        const p = edgePath(e, i)
        if (!p) return null
        const active = isActiveEdge(e)
        const label = e.on ?? e.label
        return (
          <g key={`e${i}`}>
            <path
              d={p.d}
              fill="none"
              stroke={active ? 'var(--accent-bright)' : 'var(--dia-edge)'}
              strokeWidth={active ? 2.5 : 1.5}
              markerEnd={active ? `url(#${arrowActiveId})` : `url(#${arrowId})`}
              opacity={active ? 1 : 0.65}
            />
            {label && (
              <text
                x={p.mx}
                y={p.my}
                fill={active ? 'var(--accent-bright)' : 'var(--fg-secondary)'}
                fontSize="10"
                fontFamily="var(--font-mono)"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {label}
              </text>
            )}
          </g>
        )
      })}

      {/* nodes */}
      {spec.nodes.map((n) => {
        const row = rowOf.get(n.id)!
        const active = n.id === activeNodeId
        const color = KIND_COLOR[n.kind]
        const badge = badges?.[n.id]
        const clickable = Boolean(onNodeClick)
        return (
          <g
            key={n.id}
            onClick={clickable ? () => onNodeClick!(n.id) : undefined}
            onKeyDown={
              clickable
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onNodeClick!(n.id)
                    }
                  }
                : undefined
            }
            tabIndex={clickable ? 0 : undefined}
            role={clickable ? 'button' : undefined}
            aria-label={clickable ? `${n.label} — ${badge ?? 0} events` : undefined}
            style={clickable ? { cursor: 'pointer' } : undefined}
          >
            <rect
              x={nodeX}
              y={yTop(row)}
              width={NODE_W}
              height={NODE_H}
              rx={8}
              fill={active ? 'var(--bg-overlay)' : 'var(--dia-node-bg)'}
              stroke={active ? color : 'var(--dia-node-border)'}
              strokeWidth={active ? 3 : 1.5}
            />
            {/* kind color chip on the left edge */}
            <rect x={nodeX} y={yTop(row)} width={6} height={NODE_H} rx={3} fill={color} />
            {/* Label via foreignObject so it wraps INSIDE the box (SVG <text>
                won't wrap): overflow-wrap breaks long identifiers like
                run_conversation(user_message), and an explicit \n in the label
                data hard-breaks into lines. */}
            <foreignObject x={nodeX} y={yTop(row)} width={NODE_W} height={NODE_H}>
              <div className={`loop-node-label${active ? ' loop-node-label--active' : ''}`}>
                {n.label.split('\n').map((line, i) => (
                  <span key={i} className="loop-node-line">
                    {line}
                  </span>
                ))}
              </div>
            </foreignObject>
            {badge != null && badge > 0 && (
              <g transform={`translate(${nodeX + NODE_W - 8}, ${yTop(row) + 2})`}>
                <circle r="10" fill="var(--accent-fill)" stroke="var(--accent-bright)" strokeWidth="1.5" />
                <text
                  fill="var(--accent-bright)"
                  fontSize="11"
                  fontFamily="var(--font-mono)"
                  fontWeight={700}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {badge}
                </text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export { NODE_W }
