/**
 * Ambient typing for the Artificer tablist keyboard helper
 * (public/artificer/artificer-tabs.js, loaded as a plain <script defer>).
 * Ships the WAI-ARIA APG tabs state machine — roving tabindex, ←/→/Home/End,
 * selection, panel toggling — the same way artificer-focus.js ships focus-trapping.
 *
 * This app uses only the pure `nextIndex` index math (App.tsx onTabKeyDown) and
 * lets React own the DOM; `enhance`/`observe` are declared for completeness but
 * are deliberately NOT adopted here (they mutate aria-selected / panel.hidden on
 * nodes React owns, and snapshot a tab set that's dynamic per harness).
 */
interface ArtificerTabsApi {
  /**
   * The roving-tabindex state machine (no DOM). Returns the index focus/selection
   * should move to for `key`, or `null` when `key` isn't a tab-navigation key (or
   * `count <= 0`) — the caller does nothing and skips preventDefault.
   */
  nextIndex(
    key: string,
    current: number,
    count: number,
    opts?: { orientation?: 'horizontal' | 'vertical' },
  ): number | null
  /** Wire one tablist's full keyboard + click behavior. Idempotent; returns a handle. */
  enhance(
    tablist: Element | null,
    opts?: {
      orientation?: 'horizontal' | 'vertical'
      onSelect?: (tab: Element, index: number) => void
    },
  ): { select(index: number): void; destroy(): void }
  /** Auto-enhance every [data-tabs] under `root` now and as nodes are inserted (SPA). */
  observe(root?: Document | Element): () => void
}

interface Window {
  ArtificerTabs?: ArtificerTabsApi
}
