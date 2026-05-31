# Artificer adaptations

How this project bends the Artificer design system, and why. Each entry mirrors a
feedback issue filed upstream.

## 2026-05-31 — v0.6 → v0.10.1 full re-vendor

- **Upstream issue:** cameronsjo/artificer-design-system#77
- **Install path:** A (vanilla vendored copy under `site/public/artificer/`)
- **Pivot:** Crossed every boundary (0.8→0.9→0.10.0→0.10.1) in one All-in re-vendor via `/artificer-upgrade`.
- **Finding:** All three matrix-flagged high-risk boundaries were already no-ops here:
  - px→rem (0.10.0): app already fully `rem`-based, no `--t-*-size` overrides.
  - theme key (0.10.0): already `'artificer.theme'` (dot) in `artificer-theme.js` + `App.tsx`.
  - brandPurpleBright/`.tok-keyword` (0.10.1): app emits no `tok-*` spans; syntax CSS dormant.
- **Only real change:** Added the inline FOUC bootstrap (`theme-bootstrap.html`) to `index.html` `<head>` before first paint; kept the deferred `artificer-theme.js` for the runtime API. `App.tsx` unchanged (its `.theme-toggle` class never collides with the new `[data-theme-toggle]` `bind()`).
- **Upstream bug reported:** `main/src/artificer.css` banner still says "v0.6" while `--art-version` is `0.10.1` — banner-based detection misleads.
- **Lane:** 3 (no palette value or role-name changes).

## 2026-05-31 — adopting v0.10 nav primitives (discoverability)

- **Upstream issue:** cameronsjo/artificer-design-system#78
- **Type:** confusion (docs/clarity gap), Lane 3.
- **Friction:** Learning which nav primitives exist and their roles required grepping ~1,700 lines of `site/public/artificer/artificer.css` (taxonomy buried at `:1015–1024`). The upstream catalogs (`cheatsheet.md`, `live-spec/components.html`, react adapters) aren't part of the vendored payload — a vendored consumer only gets CSS/JS + `tokens.json`.
- **Decision:** Map `.sidenav` → harness selection (scales vertically; rail/drawer on mobile), `.tabs` → view, `.appbar` → brand/theme. Hooks/Wire become Claude-Code-pinned tabs. (Topology is product-specific — explicitly *not* upstreamed.)
- **Wished existed:** a vendorable `primitives.json` / `CHEATSHEET.md` riding alongside the runtime files like `tokens.json` does.
- **Related cluster:** #28 (SPA consumption contract), #35 (provenance contract).

## 2026-05-31 — nav refactor: `.sidenav`/`.nav-drawer` assume `<a>` nav

- **Upstream issue:** cameronsjo/artificer-design-system#79
- **Type:** gap (×2), Lane 3.
- **Pivot:** Re-platformed nav onto v0.10 primitives — harness → `.sidenav`, view → `.tabs`, chrome → `.appbar`.
- **Friction:** `.sidenav` styles only `.sidenav a` (`:1053`), but an SPA section-switch is a `<button>`, so every sidenav item got zero styling. Replicated the link grammar (resting/hover/`:focus-visible`/`[aria-current=page]` rail) against `.sidenav button` in `site/src/styles.css`. Note the asymmetry: `.tabs` already styles `button, a` (`:1141`); `.sidenav` doesn't.
- **Second gap:** `.nav-drawer` stays in the DOM off-canvas with no closed-state focus handling, so its buttons stayed tab-reachable (and duplicated the persistent sidenav on desktop). Toggle `inert` imperatively in `App.tsx` (closed ⇒ inert, open ⇒ `ArtificerFocus.trap`).
- **Wished existed:** widen `.sidenav` selectors to `a, button` (mirror `.tabs`), plus a drawer-pattern note on closed-state `inert`/`hidden`.
- **Don't upstream:** sticky offset `top: calc(56px + var(--s-md))` (app-specific appbar height); harness/Claude-Code-pinned tab logic (product topology).

## 2026-05-31 — `.wordmark` period detaches on a flex parent

- **Upstream issue:** cameronsjo/artificer-design-system#81
- **Type:** misfit, Lane 3.
- **Friction:** `.wordmark::after { content: "." }` (`:1169`) becomes a flex item when `.wordmark` is on a flex/grid container — including Artificer's own `.appbar__brand` (`display:flex; gap: var(--s-sm)`, `:1119`). The container `gap` opens a space, so the brand reads `agentic harnesses .` not `agentic harnesses.`. Reappeared on a second surface composed the same way — a system trap, not a typo.
- **Fix (consumer):** apply `.wordmark` to the inline `<span>` inside `.appbar__brand`, not to the flex container itself, so `::after` stays inline with the text. See `site/src/App.tsx` brand markup.
- **Wished existed:** guard the period against parent gap, or document "`.wordmark` goes on an inline text element, never a flex/grid container."
- **Don't upstream:** nothing product-specific.

## 2026-05-31 — `.appbar` inline padding double-insets inside a container

- **Upstream issue:** cameronsjo/artificer-design-system#83
- **Type:** misfit, Lane 3.
- **Friction:** `.appbar { padding: 0 var(--s-md) }` (+ safe-area `padding-left/right: max(...)`, `:1192`) is the full-bleed gutter, but our appbar sits inside `.container--lg` (already padded), so the brand double-insets one `--s-md` right of the lede/sidenav and the bar's divider starts left of the mark.
- **Fix (consumer):** `.app .appbar { padding-inline: 0 }` in `site/src/styles.css` — higher specificity to beat both the base rule and its safe-area variant.
- **Wished existed:** a contained-appbar note or `.appbar--contained` modifier that drops the inline padding when the container owns the gutter.
- **Don't upstream:** nothing product-specific.
