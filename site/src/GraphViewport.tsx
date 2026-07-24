import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  computeFit,
  computeZoom,
  IDENTITY,
  MAX_SCALE,
  MIN_SCALE,
  ZOOM_STEP,
  type Transform,
} from './viewport'

/** Trackpad pinch arrives as ctrl+wheel; divisor tunes it to roughly one step per gesture. */
const WHEEL_DIVISOR = 260
/** Arrow-key pan distance in CSS pixels. */
const KEY_PAN = 32

interface Props {
  /** The diagram to frame. Any element with an intrinsic layout size works. */
  children: ReactNode
  /**
   * Describes what is being framed, for the control group's accessible name
   * (e.g. "Claude Code loop graph").
   */
  label: string
  /** Extra classes for the outer element, e.g. the `card graph-pane` shell. */
  className?: string
}

/**
 * Pan / zoom / fit-to-pane frame around a diagram (issue #3).
 *
 * Transforms a wrapper div rather than the SVG's own viewBox, for two reasons:
 * the wrapped diagram stays a pure renderer with no viewport concerns, and the
 * frame becomes content-agnostic — issue #7 wants the same control mounted
 * around the whole compare row, which is a grid of SVGs, not one.
 *
 * Fit is the resting state and re-applies on container resize, but only until
 * the user adjusts something; after that their framing is preserved through
 * resizes rather than being yanked back to fit.
 */
export function GraphViewport({ children, label, className }: Props) {
  const paneRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState<Transform>(IDENTITY)
  const [adjusted, setAdjusted] = useState(false)
  // Drag origin in client coords plus the translation at grab time; null when idle.
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; baseX: number; baseY: number } | null>(null)

  /** Reads current layout and hands it to the pure fit math. */
  const fitTransform = useCallback((): Transform => {
    const pane = paneRef.current
    const content = contentRef.current
    if (!pane || !content) return IDENTITY
    // offsetWidth/Height are layout metrics — unaffected by the transform we
    // apply, so this stays correct no matter the current zoom.
    return computeFit({
      contentW: content.offsetWidth,
      contentH: content.offsetHeight,
      paneW: pane.clientWidth,
      paneH: pane.clientHeight,
    })
  }, [])

  const fit = useCallback(() => {
    setTransform(fitTransform())
    setAdjusted(false)
  }, [fitTransform])

  /**
   * Zoom about a fixed point so the diagram grows toward the cursor. Button and
   * keyboard zoom pass no origin and get the pane center.
   */
  const zoomAbout = useCallback((factor: number, originX?: number, originY?: number) => {
    setTransform((prev) => {
      const pane = paneRef.current
      if (!pane) return prev
      return computeZoom(prev, factor, originX ?? pane.clientWidth / 2, originY ?? pane.clientHeight / 2)
    })
    setAdjusted(true)
  }, [])

  // Mirror `adjusted` into a ref so the ResizeObserver below reads the current
  // value without re-subscribing on every interaction.
  const adjustedRef = useRef(adjusted)
  adjustedRef.current = adjusted

  // Fit once the content has a measurable size, and re-fit on resize until the
  // user takes over. ResizeObserver covers both the pane (window/layout changes)
  // and the content (a different harness spec swapping in).
  useEffect(() => {
    const pane = paneRef.current
    const content = contentRef.current
    if (!pane || !content) return
    const observer = new ResizeObserver(() => {
      if (!adjustedRef.current) setTransform(fitTransform())
    })
    observer.observe(pane)
    observer.observe(content)
    return () => observer.disconnect()
  }, [fitTransform])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Left button / touch / pen only, and never start a drag from a control.
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('button')) return
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      baseX: transform.x,
      baseY: transform.y,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    // A pointerup can go missing — the pointer leaves the window, the browser
    // cancels the capture, another handler swallows it. Without this the drag
    // stays live and the diagram follows a button-up cursor around the pane.
    if (e.buttons === 0) {
      endDrag(e)
      return
    }
    setTransform((prev) => ({
      ...prev,
      x: drag.baseX + (e.clientX - drag.startX),
      y: drag.baseY + (e.clientY - drag.startY),
    }))
    setAdjusted(true)
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== e.pointerId) return
    dragRef.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }

  // Non-passive wheel listener: React's onWheel is passive, so preventDefault()
  // there is a no-op and the browser would zoom the whole page on pinch.
  useEffect(() => {
    const pane = paneRef.current
    if (!pane) return
    const onWheel = (e: WheelEvent) => {
      // Plain wheel stays page scroll; ctrl/meta+wheel is the pinch gesture browsers
      // synthesize, and the conventional zoom modifier for a mouse.
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const rect = pane.getBoundingClientRect()
      zoomAbout(Math.exp(-e.deltaY / WHEEL_DIVISOR), e.clientX - rect.left, e.clientY - rect.top)
    }
    pane.addEventListener('wheel', onWheel, { passive: false })
    return () => pane.removeEventListener('wheel', onWheel)
  }, [zoomAbout])

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const pan = (dx: number, dy: number) => {
      setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }))
      setAdjusted(true)
    }
    switch (e.key) {
      case 'ArrowLeft': pan(KEY_PAN, 0); break
      case 'ArrowRight': pan(-KEY_PAN, 0); break
      case 'ArrowUp': pan(0, KEY_PAN); break
      case 'ArrowDown': pan(0, -KEY_PAN); break
      case '+': case '=': zoomAbout(ZOOM_STEP); break
      case '-': case '_': zoomAbout(1 / ZOOM_STEP); break
      case '0': fit(); break
      default: return
    }
    e.preventDefault()
  }

  const percent = Math.round(transform.scale * 100)

  return (
    <div className={className}>
      <div
        ref={paneRef}
        className="graph-viewport"
        // The frame is a focusable group so arrow-key pan and +/-/0 reach it;
        // the diagram inside keeps its own role="img" and accessible name.
        role="group"
        tabIndex={0}
        aria-label={`${label} — pan and zoom. Arrow keys pan, plus and minus zoom, zero fits.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
        <div
          ref={contentRef}
          className="graph-viewport__content"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          }}
        >
          {children}
        </div>
      </div>

      <div className="graph-viewport__controls cluster">
        <button
          type="button"
          className="btn btn--ghost btn--sm btn--icon"
          aria-label="Zoom out"
          onClick={() => zoomAbout(1 / ZOOM_STEP)}
          disabled={transform.scale <= MIN_SCALE}
        >
          <i data-icon="minus" data-icon-size="16" />
        </button>
        <output className="graph-viewport__level" aria-label="Zoom level">
          {percent}%
        </output>
        <button
          type="button"
          className="btn btn--ghost btn--sm btn--icon"
          aria-label="Zoom in"
          onClick={() => zoomAbout(ZOOM_STEP)}
          disabled={transform.scale >= MAX_SCALE}
        >
          <i data-icon="plus" data-icon-size="16" />
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={fit}
          disabled={!adjusted}
        >
          Fit
        </button>
      </div>
    </div>
  )
}
