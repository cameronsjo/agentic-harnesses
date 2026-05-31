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
