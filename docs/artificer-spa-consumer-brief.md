# Consuming the Artificer design system in a React SPA — handoff brief

> A field-tested briefing for the next person (or agent) wiring the Artificer
> design system into a Vite/React/TypeScript single-page app. Distilled from the
> `agentic-harnesses` visualizer build. Hand this to a fresh session as context.

## What you're working with

Artificer ships as **vanilla CSS + plain `<script>` helpers**, not a React
package. It's published on npm as `@cameronsjo/artificer`; consume it with
side-effect imports in your entry module (`src/main.tsx`) — CSS first (Vite
resolves the bundled `@font-face` fonts on import), then the JS helpers, which
are IIFEs that set `window.*` globals:

```ts
import '@cameronsjo/artificer/artificer.css'
import '@cameronsjo/artificer/whimsy.css'
import '@cameronsjo/artificer/print.css'   // self-scoped @media print
import '@cameronsjo/artificer/whimsy.js'   // → window.Whimsy
import '@cameronsjo/artificer/icons.js'    // → window.ArtificerIcons
import '@cameronsjo/artificer/focus.js'    // → window.ArtificerFocus
import '@cameronsjo/artificer/tabs.js'     // → window.ArtificerTabs
```

(Earlier this repo vendored a frozen copy under `site/public/artificer/` and
loaded it from raw `<link>`/`<script>` tags in `index.html` — that's retired;
the only thing left in `public/artificer/` is `assets/` for favicon + OG image.)
Skip `theme.js` if you own the toggle in React (below). The package ships **no
TypeScript types** — keep ambient `*.d.ts` for the `window.Artificer*` globals.

You style with its tokens and classes; you do **not** import components. That
single fact drives almost every gotcha below.

## The #1 lesson: the helper scripts bind once, before React exists

Every Artificer helper script wires itself up on `DOMContentLoaded` with a
**one-shot pass over the static DOM**. A React SPA mounts *after* that event and
keeps mutating the DOM forever after, so anything React renders is invisible to
those one-shot bindings. This bit us four separate times:

| Helper | Symptom in an SPA | What we did |
|---|---|---|
| `artificer-theme.js` | Theme toggle button never responds (handler bound before the button mounted) | Re-implement the toggle in React; drive the same `data-theme` attribute + `artificer.theme` localStorage key yourself. Keep class `.theme-toggle` but **no** `data-theme-toggle` attr, so the vendored script doesn't double-bind. |
| `artificer-icons.js` | `<i data-icon="x">` mounted in a modal/drawer renders **blank** (one-shot hydrate already ran) | Call `window.ArtificerIcons.observe()` once at app mount — it re-hydrates and sets a MutationObserver for future nodes. (filed: #95) |
| `artificer-focus.js` | n/a — it exposes an imperative API, no auto-binding | Call `window.ArtificerFocus.trap(el, { onEscape })` in a `useEffect` when a modal/drawer opens; call the returned `release()` on close. |
| `artificer-whimsy.js` | Wordmark shimmer never runs (element mounted post-load) | Drive it via a ref: `window.Whimsy?.run(titleRef.current, {...})` in a mount effect. |

**Rule of thumb:** treat every Artificer script as "static-DOM-only." If a feature
must work on React-mounted nodes, find its imperative API (`observe`, `trap`,
`run`) and call it from an effect. Add ambient `*.d.ts` typings for the
`window.Artificer*` globals you use (mirror the one-method-per-API style).

## Navigation architecture

Artificer's v0.10 nav primitives map cleanly onto two orthogonal axes — use them
for what they're named, don't blend:

- **`.sidenav`** = *what sections exist* → top-level selection (here: which harness). Scales vertically; becomes the mobile drawer.
- **`.tabs`** = *which view within the current section* → e.g. Loop / Sequence / deep-dives. Omit entirely when a section has only one view.
- **`.appbar`** = global chrome → wordmark + theme toggle.

Gotchas we filed:
- `.sidenav` styles only `<a>`, but SPA section-switches are `<button>`s — add a CSS shim replicating `.sidenav a` rules for `.sidenav button`. (#79)
- `.appbar` sets its own inline padding (double-insets inside a padded container — zero it) and hardcodes `position: sticky` (no static modifier). (#83, #84)
- `.tabs` ships the *look* (`[aria-selected]` underline); as of v0.12 `tabs.js` also ships the *behavior* — but its `enhance`/`observe` path **owns the DOM** (sets `aria-selected`/`tabIndex`/`panel.hidden`), which fights React-controlled tabs. In an SPA, consume only the pure `ArtificerTabs.nextIndex(key, cur, count)` state machine and keep React as the selection owner. (#92; consumption non-fit logged in `docs/artificer-adaptations.md`)

## Surface & typography

- Wrap the app root in `.surface-tool` for a mono-body "instrument" feel
  (`.surface-tool * { font-family: var(--font-mono) }`).
- **Caveat:** that's a *universal-descendant* rule, so a prose island inside the
  tool surface (a legal/attribution footer, a long note) can't escape to
  `--font-sans` without a specificity fight. There's also no footer/colophon
  pattern. We hand-rolled the footer and accepted mono prose. (#97)
- Headings/labels have explicit type classes (`.t-headline-lg`, `.t-body-lg`,
  `.t-label-sm`, …) that are sans even inside a tool surface — use them.

## Token discipline

- Spacing/radius/motion: `--s-*`, `--radius-*`, `--dur-fast`, `--ease`. No raw px/hex/bespoke durations.
- Color: `--bg`, `--bg-raised`, `--fg`, `--fg-secondary`, `--accent`, `--accent-bright`, `--accent-fill`, `--border`, `--focus-*`.
- Diagrams: the `--dia-*` set (`--dia-node-bg/-border/-fg`, `--dia-edge/-edge-strong`, `--dia-rail`). **Watch out:** `--dia-rail` is `--border` at 50% opacity and is effectively invisible on the dark canvas — we used `--dia-node-border` for lifelines instead. (#96)
- Breakpoint: `--bp-tablet: 800px`. Mirror it in your media queries so nav→drawer and content reflow at the same width.

## Component gaps we hit (and the workaround pattern)

- **No large/content modal.** `.modal` maxes at 480/720 (`.modal--lg`); for a diagram/media viewer we built a `GraphModal` on top of `.scrim`/`.modal` and overrode width to `min(96vw, 1100px)` + `max-height: 92vh`, plus zeroed `.scrim` padding for a mobile full-screen sheet. (#88, #89)
- **No `.btn--sm`.** `.btn` has a role axis (`--primary/--secondary/--ghost/--icon`) but no size axis; size compact buttons with your own class. (#91)
- **Ghost icon buttons are imperceptible at rest** (`fg-secondary`, no resting affordance) — fine for dense toolbars, too faint for a modal close. Bump to `--fg` and a larger glyph where it's a primary action.

The meta-pattern: **build the composition on top of Artificer primitives, keep
the tokens, and file the gap upstream** rather than forking the system.

## The feedback loop (do this — it's a standing directive)

When Artificer fights you, file one issue per coherent pivot against
`cameronsjo/artificer-design-system` with the `feedback` label. Fire-and-forget:
no dedup, no triage, no batching — another session handles that. Use the
`artificer-feedback` skill's shape (project · pivot · deviations table · "where
it fought us" · "don't upstream" · lane · short problem-framed narrative). Lane 1
**only** if you changed a color value or minted/renamed a semantic role;
everything else is Lane 3. Also append each decision to
`docs/artificer-adaptations.md` in the consumer repo.

Issues filed from this build, for reference: #79, #81, #83, #84, #88, #89, #91,
#92, #95, #96, #97.

## Starter checklist for a new consumer

1. `npm i @cameronsjo/artificer`; side-effect-import its CSS + JS helpers in `src/main.tsx`.
2. At app mount: `ArtificerIcons.observe()`; re-implement theme in React; wire whimsy/focus via refs/effects.
3. Wrap root in `.surface-tool`; use `.t-*` type classes for any sans text.
4. Pick the nav topology: `.sidenav` (sections) + `.tabs` (views) + `.appbar` (chrome); add the `.sidenav button` shim; plan to hand-roll ARIA tabs.
5. Style only with tokens. Mirror `--bp-tablet: 800px`.
6. For diagrams, prefer `--dia-node-border` over the too-faint `--dia-rail`.
7. File friction as you go.
