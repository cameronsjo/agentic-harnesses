import type { KeyboardEvent } from 'react'

/**
 * Shared roving-tabindex keydown handler, built on Artificer's pure `nextIndex()`
 * state machine (window.ArtificerTabs). Computes the target index for ←/→/Home/End,
 * hands it to `onPick` (React stays the selection owner — we never cede the DOM to
 * the JS tab *enhancer*, which would fight controlled rendering), then moves focus
 * to the sibling control at that index. Non-nav keys — and the case where the helper
 * script is absent — are a no-op.
 *
 * Consumed by both the view tablist (App.tsx) and the TabPicker toggle group
 * (controls.tsx); see docs/artificer-adaptations.md for why only the pure export is
 * used, not the DOM-owning `enhance`/`observe` path.
 */
export function onRovingTabKeyDown(
  e: KeyboardEvent<HTMLElement>,
  current: number,
  count: number,
  onPick: (next: number) => void,
  controlSelector = '[role="tab"]',
) {
  const next = window.ArtificerTabs?.nextIndex(e.key, current, count)
  if (next == null) return // not a tab-nav key (or helper absent) → no-op
  e.preventDefault()
  onPick(next)
  const controls = e.currentTarget.parentElement?.querySelectorAll<HTMLElement>(controlSelector)
  controls?.[next]?.focus()
}
