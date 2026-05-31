import { useEffect, useMemo, useRef, useState } from 'react'
import { specs, sharedScenarios } from './data'
import { Anchored } from './Anchored'
import { LoopGraph } from './LoopGraph'
import { edgeBetween, usePlayerTimer } from './player'
import { TabPicker, TransportBar } from './controls'

interface Props {
  scenarioId: string
  onScenarioChange: (id: string) => void
}

/** The headline feature: every harness runs the SAME scenario, stepped in lockstep. */
export function ScenarioCompare({ scenarioId, onScenarioChange }: Props) {
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

  // Horizontal-scroll affordance. The bottom scrollbar alone isn't discoverable
  // (macOS overlay scrollbars hide it at rest), so we surface BOTH an edge fade
  // (passive "there's more") and a chevron pager (active control) — the A/B landed
  // on keeping both. Each is gated by a live overflow + scroll-position check.
  const gridRef = useRef<HTMLDivElement>(null)
  // `active` is the card nearest the viewport center — drives the mobile dot pager.
  const [scroll, setScroll] = useState({ overflowing: false, atStart: true, atEnd: true, active: 0 })
  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    const update = () => {
      // Nearest-center wins — width-agnostic, so it's correct for both the desktop
      // multi-card filmstrip and the mobile one-card-per-screen carousel.
      const center = el.scrollLeft + el.clientWidth / 2
      let active = 0
      let best = Infinity
      Array.from(el.children).forEach((c, i) => {
        const card = c as HTMLElement
        const dist = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center)
        if (dist < best) {
          best = dist
          active = i
        }
      })
      setScroll({
        overflowing: el.scrollWidth > el.clientWidth + 1,
        atStart: el.scrollLeft <= 1,
        atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1,
        active,
      })
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])
  // On mobile each card == clientWidth, so paging by clientWidth lands exactly one
  // card over (scroll-snap then settles it); desktop keeps the gentler 0.8 stride.
  const page = (dir: -1 | 1) => {
    const el = gridRef.current
    if (!el) return
    const stride = window.matchMedia('(max-width: 800px)').matches ? 1 : 0.8
    el.scrollBy({ left: dir * el.clientWidth * stride, behavior: 'smooth' })
  }
  const scrollToCard = (i: number) => {
    const el = gridRef.current
    const card = el?.children[i] as HTMLElement | undefined
    if (!el || !card) return
    el.scrollTo({ left: card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2, behavior: 'smooth' })
  }

  return (
    <section className="compare">
      <div className="compare-controls">
        <TabPicker
          ariaLabel="Scenario"
          items={sharedScenarios.map((s) => ({ id: s.id, label: s.id }))}
          active={scenarioId}
          onSelect={onScenarioChange}
        />
        <TransportBar player={player} playLabel="Play all" total={maxSteps} counterLabel="step" />
      </div>

      <p className="scenario-title">
        <Anchored text={sharedScenarios.find((s) => s.id === scenarioId)?.title ?? ''} />
      </p>

      <div className="compare-scroll">
        {scroll.overflowing && (
          <button
            type="button"
            className="btn btn--ghost btn--icon compare-chev compare-chev--left"
            aria-label="Scroll comparison left"
            disabled={scroll.atStart}
            onClick={() => page(-1)}
          >
            ‹
          </button>
        )}
        <div className="compare-grid" ref={gridRef}>
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
        {scroll.overflowing && (
          <button
            type="button"
            className="btn btn--ghost btn--icon compare-chev compare-chev--right"
            aria-label="Scroll comparison right"
            disabled={scroll.atEnd}
            onClick={() => page(1)}
          >
            ›
          </button>
        )}
        <div
          className="compare-fade compare-fade--left"
          data-show={scroll.overflowing && !scroll.atStart}
          aria-hidden="true"
        />
        <div
          className="compare-fade compare-fade--right"
          data-show={scroll.overflowing && !scroll.atEnd}
          aria-hidden="true"
        />
      </div>

      {/* Mobile carousel position indicator (CSS hides it on the desktop filmstrip,
          which has chevrons + edge fades instead). One dot per harness; tap to jump. */}
      {scroll.overflowing && (
        <div className="compare-dots" role="group" aria-label="Jump to harness">
          {columns.map(({ spec }, i) => (
            <button
              key={spec.harness}
              type="button"
              className={`compare-dot ${i === scroll.active ? 'compare-dot--active' : ''}`}
              aria-label={`Show ${spec.displayName}`}
              aria-current={i === scroll.active ? 'true' : undefined}
              onClick={() => scrollToCard(i)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
