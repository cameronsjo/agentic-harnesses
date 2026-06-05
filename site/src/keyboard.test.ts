import { afterEach, describe, expect, it, vi } from 'vitest'
import type { KeyboardEvent } from 'react'
import { onRovingTabKeyDown } from './keyboard'

// onRovingTabKeyDown reads window.ArtificerTabs (a side-effecting global set by
// the Artificer tabs.js helper) and walks the DOM via e.currentTarget. The test
// env is node (no jsdom), so we stub both: window.ArtificerTabs.nextIndex is the
// pure state machine, and the event carries a hand-built parentElement whose
// querySelectorAll returns focusable stand-ins. This keeps the test to the
// function's own branch logic without a DOM harness.

afterEach(() => {
  vi.unstubAllGlobals()
})

/** A focusable stand-in that records whether focus() was called. */
function focusable() {
  return { focus: vi.fn() }
}

/**
 * Build a fake React keydown event. `controls` becomes the array returned by
 * the parent's querySelectorAll; `selectorSpy` (if given) observes the selector
 * argument querySelectorAll was called with.
 */
function makeEvent(
  key: string,
  controls: Array<{ focus: () => void }> = [],
  selectorSpy?: (sel: string) => void,
) {
  return {
    key,
    preventDefault: vi.fn(),
    currentTarget: {
      parentElement: {
        querySelectorAll: (sel: string) => {
          selectorSpy?.(sel)
          return controls
        },
      },
    },
  } as unknown as KeyboardEvent<HTMLElement>
}

/** Install window.ArtificerTabs.nextIndex returning `ret`; return the spy. */
function stubNextIndex(ret: number | null) {
  const nextIndex = vi.fn(() => ret)
  vi.stubGlobal('window', { ArtificerTabs: { nextIndex } })
  return nextIndex
}

describe('onRovingTabKeyDown', () => {
  it('moves selection and focus to the index nextIndex returns', () => {
    stubNextIndex(2)
    const onPick = vi.fn()
    const controls = [focusable(), focusable(), focusable()]
    const e = makeEvent('ArrowRight', controls)

    onRovingTabKeyDown(e, 0, 3, onPick)

    expect(e.preventDefault).toHaveBeenCalledOnce()
    expect(onPick).toHaveBeenCalledExactlyOnceWith(2)
    expect(controls[2].focus).toHaveBeenCalledOnce()
    expect(controls[0].focus).not.toHaveBeenCalled()
  })

  it('forwards key, current, and count to nextIndex', () => {
    const nextIndex = stubNextIndex(0)
    onRovingTabKeyDown(makeEvent('Home'), 3, 5, vi.fn())
    expect(nextIndex).toHaveBeenCalledExactlyOnceWith('Home', 3, 5)
  })

  it('is a no-op when nextIndex returns null (non-nav key)', () => {
    stubNextIndex(null)
    const onPick = vi.fn()
    const e = makeEvent('a')

    onRovingTabKeyDown(e, 0, 3, onPick)

    expect(onPick).not.toHaveBeenCalled()
    expect(e.preventDefault).not.toHaveBeenCalled()
  })

  it('is a no-op when the ArtificerTabs helper is absent', () => {
    vi.stubGlobal('window', {}) // helper script not loaded → window.ArtificerTabs undefined
    const onPick = vi.fn()
    const e = makeEvent('ArrowRight')

    onRovingTabKeyDown(e, 0, 3, onPick)

    expect(onPick).not.toHaveBeenCalled()
    expect(e.preventDefault).not.toHaveBeenCalled()
  })

  it('defaults the control selector to [role="tab"] and overrides when passed', () => {
    stubNextIndex(0)
    let usedDefault = ''
    onRovingTabKeyDown(makeEvent('End', [focusable()], (s) => (usedDefault = s)), 0, 1, vi.fn())
    expect(usedDefault).toBe('[role="tab"]')

    stubNextIndex(0)
    let usedCustom = ''
    onRovingTabKeyDown(
      makeEvent('End', [focusable()], (s) => (usedCustom = s)),
      0,
      1,
      vi.fn(),
      'button',
    )
    expect(usedCustom).toBe('button')
  })

  it('still selects when the focus target is missing (short control list)', () => {
    stubNextIndex(5) // index beyond the rendered controls
    const onPick = vi.fn()
    const e = makeEvent('End', [focusable()]) // only one control

    expect(() => onRovingTabKeyDown(e, 0, 1, onPick)).not.toThrow()
    expect(onPick).toHaveBeenCalledExactlyOnceWith(5) // selection still fires; focus no-ops
  })
})
