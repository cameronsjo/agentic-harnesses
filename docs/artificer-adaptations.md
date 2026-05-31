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
- **Only real change:** Added an inline FOUC bootstrap `<script>` to `site/index.html`'s `<head>` (runs before first paint — no separate `theme-bootstrap.html` artifact); kept the deferred `artificer-theme.js` for the runtime API. `App.tsx` unchanged (its `.theme-toggle` class never collides with the new `[data-theme-toggle]` `bind()`).
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

## 2026-05-31 — `.appbar` hardcodes `position: sticky`

- **Upstream issue:** cameronsjo/artificer-design-system#84
- **Type:** misfit, Lane 3.
- **Friction:** `.appbar` hardcodes `position: sticky` with no opt-out; we wanted a static (non-sticky) chrome bar. Overrode `.app .appbar { position: static }` in `site/src/styles.css`.
- **Wished existed:** a `.appbar--static` modifier (or a sticky toggle) so consumers can choose.
- **Don't upstream:** nothing product-specific.

## 2026-05-31 — `.modal` has no large/content-viewer variant

- **Upstream issue:** cameronsjo/artificer-design-system#88
- **Type:** gap, Lane 3.
- **Pivot:** Built `GraphModal`, an enlarge-to-modal diagram viewer, on `.scrim`/`.modal`.
- **Friction:** `.modal` maxes at 480 / 720 (`.modal--lg`) — sized for dialogs, not a media/diagram viewer. Overrode `.graph-modal` to `width: min(96vw, 1100px)` + `max-height: 92vh` + `padding: 0`.
- **Wished existed:** a `.modal--xl` / `.modal--full` or a documented content-viewer modal pattern.
- **Don't upstream:** the graph-specific two-column layout.

## 2026-05-31 — `.scrim` padding fights a mobile full-screen sheet

- **Upstream issue:** cameronsjo/artificer-design-system#89
- **Type:** misfit, Lane 3.
- **Friction:** `.scrim { padding: var(--s-lg) }` keeps a gap around the modal, preventing a true edge-to-edge mobile sheet. Overrode `.graph-scrim { padding: 0 }` at the tablet breakpoint so the modal fills the viewport.
- **Wished existed:** a way to opt the scrim out of its padding for full-screen content.
- **Don't upstream:** nothing product-specific.

## 2026-05-31 — `.btn` has a role axis but no size axis

- **Upstream issue:** cameronsjo/artificer-design-system#91
- **Type:** gap, Lane 3.
- **Friction:** `.btn` offers `--primary/--secondary/--ghost/--icon` (role) but no size variant; tried `.btn--sm` (no-op) and sized the compact Expand chip via `.graph-expand` custom CSS.
- **Wished existed:** a `.btn--sm` size modifier composable with the role variants.
- **Don't upstream:** nothing product-specific.

## 2026-05-31 — `.tabs` ships the look but not the WAI-ARIA behavior

- **Upstream issue:** cameronsjo/artificer-design-system#92
- **Type:** gap, Lane 3.
- **Friction:** `.tabs` styles the `[aria-selected]` underline but ships no behavior — no roving tabindex, no ←/→/Home/End nav, no tab↔tabpanel association. Hand-rolled the full WAI-ARIA tabs pattern in `App.tsx`.
- **Wished existed:** a JS helper (like `ArtificerFocus`) or a documented tabs pattern.
- **Don't upstream:** the harness/Claude-Code-pinned tab topology.

## 2026-05-31 — icon script one-shot-hydrates, blanks SPA-mounted `<i data-icon>`

- **Upstream issue:** cameronsjo/artificer-design-system#95
- **Type:** confusion / default gap, Lane 3.
- **Friction:** `artificer-icons.js` auto-inits a one-shot `hydrate()` on `DOMContentLoaded` and never arms `observe()`, so an `<i data-icon="x">` React mounts on click (the modal close button) rendered as an invisible empty button. Call `window.ArtificerIcons.observe()` once at app mount (`App.tsx`) to hydrate + watch for inserted nodes.
- **Wished existed:** auto-init calls `observe(document.body)` when a `MutationObserver` exists, or the include snippet notes SPAs must call it.
- **Don't upstream:** nothing product-specific. (Same SPA-lifecycle seam as the theme/focus/whimsy scripts.)

## 2026-05-31 — `--dia-rail` too faint to see as a lifeline

- **Upstream issue:** cameronsjo/artificer-design-system#96
- **Type:** override / misfit, Lane 3 (maybe 1 — it's a token value).
- **Friction:** `--dia-rail` is `--border` at 50% opacity — effectively invisible on the dark canvas, so sequence-diagram lifelines disappeared. Swapped them to `--dia-node-border` at 1.5px.
- **Wished existed:** a rail token tuned for visibility as a thin dashed guide line (not derived as "border, but fainter").
- **Don't upstream:** the `--dia-node-border` substitution (nearest visible token, not a considered rail color).

## 2026-05-31 — no footer/colophon pattern; `.surface-tool` mono traps prose

- **Upstream issue:** cameronsjo/artificer-design-system#97
- **Type:** misfit + gap, Lane 3.
- **Friction:** `.surface-tool, .surface-tool *` forces `--font-mono` on every descendant, so a prose disclaimer footer can't escape to `--font-sans` (lost at equal specificity; Artificer loads last). No footer/colophon primitive exists either. Hand-rolled `.app-footer` + a two-column `.footer-grid` + full-width `.footer-fine`, and accepted mono prose.
- **Wished existed:** a prose/document escape hatch inside a tool surface, and a `.footer`/`.colophon` pattern (columns + a fine-print tier).
- **Don't upstream:** the exact column proportions and copy. See also `docs/disclaimer-footer-pattern.md`.

## 2026-05-31 — hamburger as primary mobile nav (size + contrast)

- **Upstream issue:** cameronsjo/artificer-design-system#114
- **Type:** misfit + override, Lane 3.
- **Friction:** As the sole nav affordance on a phone, Artificer's hamburger under-serves on two axes. (1) The `menu` glyph (`artificer-icons.js`, `M3 6h10M3 8h10M3 10h10`) packs its three bars at y=6/8/10 — 2px gaps in the middle third of a 16-tall viewBox — so at the default 16px it reads squished. (2) `.btn--ghost.btn--icon` rests at `--fg-secondary`, too faint for a primary control. The faint-ghost repeat was already flagged for the modal close button in the SPA consumer brief.
- **Fix (consumer):** `data-icon-size="22"` on `<i data-icon="menu">` in `site/src/App.tsx`; `.appbar__menu-btn { color: var(--fg) }` in `site/src/styles.css`. Kept the library glyph — size, not an override of the path.
- **Wished existed:** a full-height `menu` glyph (bars ≈ y 4/8/12) that reads at 16px; a `.btn--icon--prominent` (or guidance) for icon buttons used as primary controls.
- **Don't upstream:** the `22` size value, the `.appbar__menu-btn` selector, and the mobile compare carousel composition (product-specific).
