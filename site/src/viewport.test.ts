import { describe, expect, it } from 'vitest'
import { computeFit, computeZoom, FIT_PADDING, IDENTITY, MAX_SCALE, MIN_SCALE, ZOOM_STEP } from './viewport'

describe('computeFit', () => {
  it('scales a too-wide diagram down until it fits the padded pane', () => {
    // 800 wide into 400 of pane minus 2x16 padding = 368 usable → 0.46.
    const fit = computeFit({ contentW: 800, contentH: 100, paneW: 400, paneH: 400 })
    expect(fit.scale).toBeCloseTo((400 - FIT_PADDING * 2) / 800)
  })

  it('scales by height when height is the tighter constraint', () => {
    const fit = computeFit({ contentW: 100, contentH: 800, paneW: 400, paneH: 400 })
    expect(fit.scale).toBeCloseTo((400 - FIT_PADDING * 2) / 800)
  })

  it('leaves a diagram smaller than the pane at 1:1 instead of blowing it up', () => {
    const fit = computeFit({ contentW: 100, contentH: 100, paneW: 900, paneH: 900 })
    expect(fit.scale).toBe(1)
  })

  it('centers the content in the pane', () => {
    const fit = computeFit({ contentW: 200, contentH: 100, paneW: 600, paneH: 400 })
    expect(fit.x).toBeCloseTo((600 - 200 * fit.scale) / 2)
    expect(fit.y).toBeCloseTo((400 - 100 * fit.scale) / 2)
  })

  it('never fits below the minimum readable scale', () => {
    const fit = computeFit({ contentW: 100_000, contentH: 100_000, paneW: 400, paneH: 400 })
    expect(fit.scale).toBe(MIN_SCALE)
  })

  it.each([
    ['zero content width', { contentW: 0, contentH: 100, paneW: 400, paneH: 400 }],
    ['zero content height', { contentW: 100, contentH: 0, paneW: 400, paneH: 400 }],
    ['unlaid-out pane', { contentW: 100, contentH: 100, paneW: 0, paneH: 0 }],
  ])('resolves to identity for %s rather than dividing by zero', (_label, input) => {
    expect(computeFit(input)).toEqual(IDENTITY)
  })
})

describe('computeZoom', () => {
  it('holds the origin point stationary while scaling', () => {
    const prev = { scale: 1, x: 0, y: 0 }
    const next = computeZoom(prev, 2, 100, 50)
    // The content point under the origin before and after must be the same one.
    const contentPointBefore = { x: (100 - prev.x) / prev.scale, y: (50 - prev.y) / prev.scale }
    const contentPointAfter = { x: (100 - next.x) / next.scale, y: (50 - next.y) / next.scale }
    expect(contentPointAfter.x).toBeCloseTo(contentPointBefore.x)
    expect(contentPointAfter.y).toBeCloseTo(contentPointBefore.y)
  })

  it('holds the origin stationary when zooming an already panned view', () => {
    const prev = { scale: 0.64, x: -120, y: 75 }
    const next = computeZoom(prev, ZOOM_STEP, 220, 180)
    const before = { x: (220 - prev.x) / prev.scale, y: (180 - prev.y) / prev.scale }
    const after = { x: (220 - next.x) / next.scale, y: (180 - next.y) / next.scale }
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
  })

  it('clamps to the maximum scale', () => {
    expect(computeZoom({ scale: 1, x: 0, y: 0 }, 100, 0, 0).scale).toBe(MAX_SCALE)
  })

  it('clamps to the minimum scale', () => {
    expect(computeZoom({ scale: 1, x: 0, y: 0 }, 0.001, 0, 0).scale).toBe(MIN_SCALE)
  })

  it('returns the same object when already clamped, so callers can skip the update', () => {
    const atMax = { scale: MAX_SCALE, x: 10, y: 20 }
    expect(computeZoom(atMax, ZOOM_STEP, 0, 0)).toBe(atMax)
  })

  it('round-trips a zoom in and back out to the starting transform', () => {
    const start = { scale: 1, x: 40, y: -20 }
    const zoomed = computeZoom(start, ZOOM_STEP, 150, 90)
    const back = computeZoom(zoomed, 1 / ZOOM_STEP, 150, 90)
    expect(back.scale).toBeCloseTo(start.scale)
    expect(back.x).toBeCloseTo(start.x)
    expect(back.y).toBeCloseTo(start.y)
  })
})
