/**
 * Ambient typing for the Artificer tablist helper
 * (@cameronsjo/artificer/tabs.js, imported for side effects in main.tsx).
 *
 * This SPA keeps React as the selection owner, so it consumes ONLY the pure
 * `nextIndex` roving-tabindex state machine — `enhance`/`observe` take over DOM
 * state (aria-selected/hidden/tabindex), which conflicts with React-controlled
 * tabs. See docs/artificer-adaptations.md for that non-fit.
 */
interface ArtificerTabsApi {
  /**
   * Pure roving-tabindex math. Returns the index focus/selection should move to
   * for `key`, or `null` when `key` isn't a tab-navigation key (caller no-ops).
   * Horizontal (default) uses ←/→; vertical uses ↑/↓; Home/End jump to the ends.
   */
  nextIndex(
    key: string,
    current: number,
    count: number,
    opts?: { orientation?: 'horizontal' | 'vertical' },
  ): number | null
  /** Wire one [data-tabs] tablist (idempotent). Unused here — React owns the DOM. */
  enhance(
    tablist: Element | null,
    opts?: { orientation?: 'horizontal' | 'vertical'; onSelect?: (tab: Element, i: number) => void },
  ): { select(i: number): void; destroy(): void }
  /** Auto-enhance every [data-tabs] now and on insertion. Returns a disconnect fn. */
  observe(root?: Element | Document | null): () => void
}

interface Window {
  ArtificerTabs?: ArtificerTabsApi
}
