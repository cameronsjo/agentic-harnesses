# Nav refactor — sidenav (harness) + tabs (view), Artificer v0.10 primitives

## Context

As the visualizer grows past its current 4 harnesses, the navigation breaks down.
Today `App.tsx` renders one flat `.view-nav` button bar that mixes two unrelated
dimensions and papers over the seam with a `nav-sep "Claude Code"` label:

- **Mode/view**: `Compare · Single · Sequence` (general) … then `Hooks · Wire`
  (which are actually *Claude-Code-specific* deep-dives, jammed into the global bar).
- **Harness**: only selectable *inside* the Single view, via a buried `TabPicker`.

Harness state is also fragmented — `App` holds a `harness` used only by Single,
while `SequenceView` and `ScenarioCompare` each own *their own* internal
harness/scenario state. This doesn't scale: more harnesses make the flat bar
longer, and any harness growing its own deep-dive collapses the `nav-sep` hack.

The v0.6→v0.10.1 Artificer upgrade brought nav primitives whose documented roles
map cleanly onto this app's two dimensions: **`.sidenav`** = "what sections exist"
(→ harness selection, scales vertically, rail/drawer on mobile), **`.tabs`** =
"switch the view within one surface" (→ Loop/Sequence/deep-dives), **`.appbar`** =
global chrome (→ wordmark + theme toggle). Chosen topology: **sidenav + tabs**,
with Hooks/Wire **kept Claude-Code-pinned** (relocated into Claude Code's tab set,
not made per-harness capabilities). Outcome: a navigation that absorbs new
harnesses by dropping a JSON in `src/data/loops/` (already auto-discovered by
`data.ts`) with no nav edits, and kills the `nav-sep` seam.

## Target model (single source of truth in `App.tsx`)

```ts
const [harness, setHarness]     = useState<string | null>(null) // null = "Compare all"
const [tab, setTab]             = useState<ViewTab>('loop')     // view within a harness
const [scenarioId, setScenario] = useState('edit-file')        // lifted, persists across switches
const [navOpen, setNavOpen]     = useState(false)              // mobile drawer
```

- **Context** = `harness === null` (Compare-all surface) **or** a selected harness.
- **Tabs available** (computed, no data-model change): `harness === null` → none
  (the surface *is* the compare grid); else `['loop','sequence']` **+**
  `(harness === 'claude-code' ? ['hooks','wire'] : [])`. On harness change, clamp
  `tab` back to `'loop'` if the current tab isn't available.
- **Render switch:** `null` → `<ScenarioCompare>`; `'loop'` → `<LoopPlayer>`;
  `'sequence'` → `<SequenceView>`; `'hooks'`/`'wire'` → existing Claude-Code views.

## Changes

### `site/src/App.tsx` (the bulk)
Replace the `.masthead` + flat `.view-nav` with the Artificer shell:

- **`.appbar`** (sticky top): a `.btn--ghost.btn--icon.appbar__menu-btn` hamburger
  (`<i data-icon="menu">`, shown ≤800px by Artificer's own rule) wired to
  `setNavOpen`; `.appbar__brand.wordmark` carrying the existing whimsy title ref;
  `.appbar__spacer`; `.appbar__actions` holding the **existing React `ThemeToggle`
  unchanged** (it stays class `.theme-toggle`, no `data-theme-toggle`, so the
  vendored script never double-binds — keep that seam).
- Keep the lede + `.masthead-meta` badges as a short intro band below the appbar
  (update the harness-count badge to `{specs.length}`). Not sticky.
- **App shell grid** `[ sidenav | content ]`: persistent `<aside class="app-sidenav">`
  rendering a new local `HarnessNav`, plus `<main id="main">` with the per-context
  `.tabs` bar + selected view.
- **`HarnessNav`** local component (rendered twice — persistent aside + drawer):
  a `<nav class="sidenav">` with a `.sidenav__group` "Overview" → a "Compare all"
  item, then `.sidenav__group` "Harnesses" → one item per `specs`. Mark the active
  item with `aria-current="page"`. **Use `<button>` elements** (these switch app
  state, not navigate) — Artificer styles only `.sidenav a`, so add a small CSS
  shim (below). Selecting an item sets `harness` (or `null`) and closes the drawer.
- **`.tabs`** bar (replaces `.view-nav`): `role="tablist"`, `<button role="tab"
  aria-selected>` per available tab; omit entirely in Compare-all context.
- **Mobile drawer**: render `<div class="nav-scrim" onClick=close>` + `<aside
  class="nav-drawer" aria-hidden={!navOpen}>` containing a second `HarnessNav`; set
  `data-nav-open` on the shell root when `navOpen`. Wire focus via
  `window.ArtificerFocus?.trap(drawerEl, { onEscape: () => setNavOpen(false) })`
  in a `useEffect`, calling the returned `.release()` on close (confirmed API in
  `public/artificer/artificer-focus.js`). Graceful no-op if absent.
- `Legend` shows for graph contexts (compare/loop/sequence/hooks), hidden for wire.

### `site/src/SequenceView.tsx`
Make it prop-driven like `LoopPlayer`: accept `{ spec, scenarioId, onScenarioChange }`.
Remove its internal `harness` state **and the harness `TabPicker`** (harness now
comes from the sidenav). Keep its scenario `TabPicker` (now controlled) and its
`usePlayerTimer`.

### `site/src/ScenarioCompare.tsx`
Accept `{ scenarioId, onScenarioChange }` props; drop the internal
`useState(scenarioId)`. Everything else (the `.compare-grid`, `usePlayerTimer`)
stays.

### `site/index.html`
Add `<script src="/artificer/artificer-focus.js" defer></script>`.

### `site/src/styles.css`
- Add app-shell grid; collapse below 800px.
- Sidenav button shim.
- Remove dead rules: `.view-nav`, `.nav-sep`, `.harness-pick`, `.single`.
- Fold old `@media (max-width:860px)` into tablet breakpoint.

## Verification
1. Build: `cd site && npm run build` exits 0.
2-7. Manual surface checks per plan.
