# Applying the Artificer design system

How this visualizer uses [Artificer](https://cameronsjo.github.io/artificer/) — which primitives we adopted, the patterns we built on top, and where we deliberately diverged. Artificer is document-first; this is an interactive **tool surface**, so a few things needed adapting. The friction we hit is dogfooded back upstream — the running log lives in [`artificer-adaptations.md`](./artificer-adaptations.md).

## What we adopted from the system

| Primitive | Where | Notes |
|---|---|---|
| `.container` + `.container--lg` | app shell (`App.tsx`) | width/centering + max-width. **Both** classes are required — `--lg` only sets `max-width`. |
| `.surface-tool` | app shell | mono-rooted tool surface. |
| `.appbar` (`__brand` / `__spacer` / `__actions` / `__menu-btn`) | top chrome (`App.tsx`) | sticky bar: hamburger (≤800px), wordmark, theme toggle. |
| `.sidenav` / `.sidenav__group` | harness rail (`App.tsx`) | "Overview" + "Harnesses" groups; one item per loop spec. Persistent aside ≥800px, drawer below. |
| `.tabs` / `.tab` / `.tab--active` | view switch (`App.tsx`) | Loop / Sequence (+ Hooks / Wire for Claude Code). `.tab--active` is our app-level extension. |
| `.nav-drawer` / `.nav-scrim` | mobile nav (`App.tsx`) | off-canvas sidenav + scrim below 800px. |
| `.lede` / `.masthead-meta` | intro band (`App.tsx`) | `t-body-lg` lede + ghost badges for build facts, sitting below the appbar. |
| `.scrim` / `.modal` | expand-to-modal (`GraphModal.tsx`) | full-size diagram beside a context side panel. |
| `.card` / `.card--active` | players, node inspector | active = gold left-rule. |
| `.stack` / `.stack--sm` / `.stack--lg`, `.cluster` | layout throughout | vertical / horizontal flow. |
| `.badge` / `.badge--ghost` | masthead meta row | ghost badges for build facts. |
| `.dot` / `.dot--*` | legend, node cards | status dots. |
| `.skip-link` | top of `App.tsx` | jumps to `#main`. |
| `.t-headline-md` / `.t-body-lg` / `.t-label-sm` | typography | sans type scale. |
| `.btn` / `.btn--ghost` / `.btn--secondary` / `.btn--icon` | nav + transports | |
| `.anchor` | prose | bold 3–5-word scan anchors. |
| Whimsy (`window.Whimsy`) | title + players | `run` (persistent) + `celebrate` (transient). |
| Icons (`window.ArtificerIcons`) | hamburger, modal close | `<i data-icon>` glyphs, re-hydrated on mount (see below). |
| Focus (`window.ArtificerFocus`) | mobile drawer | focus trap + Esc handling. |

## Patterns we built on top

### Anchor words in data-driven prose — `Anchored`
Loop-spec `note`/`title` fields are author-written plain strings in JSON, not JSX. Artificer ships `.anchor` styling but assumes hand-written `<b class="anchor">`. So `site/src/Anchored.tsx` lets the marker live in the data: a `**…**` span in the string is split out and promoted to `<b class="anchor">` at render. The data carries the emphasis; rendering adds no markup the data didn't ask for.

### The Whimsy doctrine — one flowing moment per view
Whimsy is potent, so we ration it: **one persistent** moment and at most **one transient** per view, never two flows competing.
- **Persistent:** the appbar wordmark runs the spectrum shimmer once on load, then settles — `window.Whimsy.run(titleRef, { loops: 3, settle: 'glacial' })`, with the canceller wired to the effect cleanup (`App.tsx`).
- **Transient:** a "turn complete" caption shimmers once when a played scenario reaches its terminal node — `window.Whimsy.celebrate(captionRef, 2200)`, fired **only on the play→end edge** via a `wasPlaying` latch so a manual step/reset to the end doesn't trigger it (`LoopPlayer.tsx`, `ScenarioCompare.tsx`).

### React-owned theme toggle
Artificer's `artificer-theme.js` binds its click handler on `DOMContentLoaded` — before this SPA mounts — so a `[data-theme-toggle]` button in our markup never gets wired. We own a `ThemeToggle` component in React instead, driving the same `data-theme` attribute and the canonical **`artificer.theme`** localStorage key (`App.tsx`).

### SPA re-hydration of vendored scripts
The theme toggle isn't the only script that binds once and misses React-mounted nodes — the icon and focus helpers do too, so we re-arm them after mount:
- **Icons:** `window.ArtificerIcons?.observe()` in a mount effect installs a `MutationObserver` that hydrates `<i data-icon>` glyphs as React adds them (the appbar hamburger, the modal close button). Without it, dynamically mounted icons render blank — the vendored auto-init only sweeps the DOM present at `DOMContentLoaded` (`App.tsx`).
- **Focus:** the mobile drawer wires `window.ArtificerFocus?.trap(el, { onEscape: () => setNavOpen(false) })` in an effect and releases it on close, so Tab cycles within the open drawer and Esc closes it (`App.tsx`).

### Sidenav as section-switcher, not navigation
Artificer styles `.sidenav a` for link navigation, but this SPA's sidenav switches **app state** (the selected harness), not URLs — so its items are `<button>`s. `styles.css` carries a matching `.sidenav button` shim replicating the `a` / `:hover` / `:focus-visible` / `[aria-current="page"]` rules with the same tokens. Filed upstream as a consumption gap: the sidenav assumes navigation `<a>`, but SPA section-switching is a `<button>`.

### Expand-to-modal — `GraphModal` + `ExpandButton`
Each diagram (Loop, Sequence, Hooks) can expand into a full-size `.scrim`/`.modal` overlay that re-renders the same diagram beside a context side panel. One `GraphModal` owns the two-column layout and one `ExpandButton` (`controls.tsx`) is shared across all three views, rather than three copies of each.

## Where we diverged (product-local, not for upstreaming)

- **Node-kind colors** — the 7-category legend (input/llm/tool/approval/execute/decision/terminal) has no home in Artificer's 4-role semantic palette, so we keep a product-local `KIND_COLOR` map inline. Harness-domain, not a core concern.
- **`.compare-col--done`** — the "all harnesses reached terminal" success state needed a green card rule; `.card--success` doesn't exist, so we hand-rolled `border-left: 2px solid var(--success)` in the card-variant grammar (`styles.css`).
- **View-specific CSS** — graph panes, the inspector sidebar, the compare grid, and the wire/sequence/curl/hooks surfaces carry layout CSS in `styles.css` that extends, rather than duplicates, the system utilities.

## Feedback filed upstream

The friction above is dogfooded back to the design system; the running consumer-side log lives in [`artificer-adaptations.md`](./artificer-adaptations.md). The foundational reports are [#35](https://github.com/cameronsjo/artificer-design-system/issues/35) (no version/provenance contract for vendored copies — the bundle carried three disagreeing version labels and no source pointer) and [#36](https://github.com/cameronsjo/artificer-design-system/issues/36) (the unowned interactive-tool / data-viz surface: categorical color, SPA-lifecycle behavior for theme/icons/focus/Whimsy, tool-surface composition). For the broader consumer writeup see [`artificer-spa-consumer-brief.md`](./artificer-spa-consumer-brief.md), and for the attribution footer specifically, [`disclaimer-footer-pattern.md`](./disclaimer-footer-pattern.md).
