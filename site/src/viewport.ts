/**
 * Pure pan/zoom math for GraphViewport (issue #3). Kept out of the component so
 * the framing rules are testable without a DOM — same split as player.ts and
 * sequence.ts.
 */

/** Zoom bounds. Below MIN labels stop being readable; above MAX a node fills the pane. */
export const MIN_SCALE = 0.3
export const MAX_SCALE = 4
/** Multiplicative step for the +/- buttons and keyboard, so each press feels equal. */
export const ZOOM_STEP = 1.25
/** Breathing room left around the content when fitting, so it never touches the frame. */
export const FIT_PADDING = 16

export interface Transform {
  scale: number
  x: number
  y: number
}

export const IDENTITY: Transform = { scale: 1, x: 0, y: 0 }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export interface FitInput {
  contentW: number
  contentH: number
  paneW: number
  paneH: number
}

/**
 * Largest scale that shows all the content inside the pane, with the content
 * centered. Never scales past 1:1 — a small graph in a big pane should sit at
 * its natural size rather than balloon to fill the frame.
 *
 * A zero-sized content or pane has no meaningful fit (it happens on the first
 * render, before layout), so it resolves to identity rather than dividing by zero.
 */
export function computeFit({ contentW, contentH, paneW, paneH }: FitInput): Transform {
  if (contentW <= 0 || contentH <= 0 || paneW <= 0 || paneH <= 0) return IDENTITY
  const availableW = paneW - FIT_PADDING * 2
  const availableH = paneH - FIT_PADDING * 2
  const scale = clamp(Math.min(availableW / contentW, availableH / contentH, 1), MIN_SCALE, MAX_SCALE)
  return {
    scale,
    x: (paneW - contentW * scale) / 2,
    y: (paneH - contentH * scale) / 2,
  }
}

/**
 * Scale by `factor` about a fixed point in pane coordinates, so the content
 * under (originX, originY) stays put. Without this the diagram drifts off-frame
 * as it grows. Returns the input unchanged when the clamp swallows the change,
 * which lets callers skip a no-op state update.
 */
export function computeZoom(prev: Transform, factor: number, originX: number, originY: number): Transform {
  const scale = clamp(prev.scale * factor, MIN_SCALE, MAX_SCALE)
  if (scale === prev.scale) return prev
  const ratio = scale / prev.scale
  return {
    scale,
    x: originX - (originX - prev.x) * ratio,
    y: originY - (originY - prev.y) * ratio,
  }
}
