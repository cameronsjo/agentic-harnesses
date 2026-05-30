import { useMemo } from 'react'
import type { LoopEdge, LoopSpec } from './types'
import { KIND_COLOR } from './types'

const NODE_W = 200
const NODE_H = 40
const ROW_H = 74
const TOP = 16
const SIDE = 64 // room for arcs on each side

export interface ActiveEdge {
  from: string
  to: string
}

interface Props {
  spec: LoopSpec
  activeNodeId?: string
  activeEdge?: ActiveEdge | null
  width?: number
}

/** Pure renderer: a harness loop as a vertical column of nodes with curved edges. */
export function LoopGraph({ spec, activeNodeId, activeEdge, width = NODE_W + SIDE * 2 }: Props) {
  const rowOf = useMemo(() => {
    const m = new Map<string, number>()
    spec.nodes.forEach((n, i) => m.set(n.id, i))
    return m
  }, [spec])

  const nodeX = (width - NODE_W) / 2
  const centerX = nodeX + NODE_W / 2
  const yTop = (row: number) => TOP + row * ROW_H
  const yMid = (row: number) => yTop(row) + NODE_H / 2
  const height = TOP + spec.nodes.length * ROW_H

  const edgePath = (e: LoopEdge): { d: string; mx: number; my: number } | null => {
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
    // Forward non-adjacent → arc on the right; backward → arc on the left.
    const edgeX = forward ? nodeX + NODE_W : nodeX
    const ctrlX = forward ? nodeX + NODE_W + SIDE * 0.85 : nodeX - SIDE * 0.85
    const y1 = yMid(fr)
    const y2 = yMid(tr)
    const cy = (y1 + y2) / 2
    return {
      d: `M ${edgeX} ${y1} C ${ctrlX} ${y1}, ${ctrlX} ${y2}, ${edgeX} ${y2}`,
      mx: ctrlX,
      my: cy,
    }
  }

  const isActiveEdge = (e: LoopEdge) =>
    activeEdge != null && activeEdge.from === e.from && activeEdge.to === e.to

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={`${spec.displayName} loop graph`}
    >
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--dia-edge-strong)" />
        </marker>
        <marker id="arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-bright)" />
        </marker>
      </defs>

      {/* edges first, under the nodes */}
      {spec.edges.map((e, i) => {
        const p = edgePath(e)
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
              markerEnd={active ? 'url(#arrow-active)' : 'url(#arrow)'}
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
        return (
          <g key={n.id}>
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
            <text
              x={centerX + 3}
              y={yMid(row)}
              fill={active ? 'var(--fg)' : 'var(--dia-node-fg)'}
              fontSize="13"
              fontFamily="var(--font-mono)"
              fontWeight={active ? 700 : 400}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {n.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export { NODE_W, SIDE }
