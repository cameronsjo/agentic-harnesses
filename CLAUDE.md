# agentic-harnesses

A visualizer + reference for how coding-agent harnesses run their loops. The `site/`
SPA renders loop / sequence / hooks / wire diagrams from JSON specs; `docs/` and
`sources/` back them with prose and pinned source clones.

## Commands (run from `site/`)

- `npm run dev` — Vite dev server
- `npm run build` — validate-loops + tsc + vite (the full gate; run before claiming done)
- `npm test` — vitest run
- `npm run validate` — validate loop JSON specs against the schema

## Layout

- `site/` — Vite + React 18 + TS SPA; source in `site/src/`.
- `site/src/data/loops/*.json` — harness loop specs, **auto-discovered** by `data.ts`.
  Add a harness by dropping a JSON here; no nav edits needed.
- `site/public/artificer/` — Artificer design system (CSS + `<script>` helpers), **generated**
  from the pinned npm package `@cameronsjo/artificer` by `scripts/vendor-artificer.mjs`
  (runs on `predev`/`prebuild`). The `*.{css,js,json}` are gitignored; only `assets/`
  (fonts, favicon, og) is committed. Bump the version in `site/package.json`, not the files.
- `sources/<harness>/` — pinned source clones the diagrams cite (`file:line`).
- `docs/` — methodology, comparison, per-harness writeups.

## Conventions & gotchas

- **A view renders a JSON spec — never hardcode harness data.** Use the `add-view` skill.
- **Consuming Artificer here:** its vendored scripts bind once on `DOMContentLoaded` and
  miss React-mounted nodes — see `docs/artificer-spa-consumer-brief.md`. Footer/disclaimer
  pattern: `docs/disclaimer-footer-pattern.md`.
- **Artificer friction → file upstream** (`cameronsjo/artificer-design-system`, label
  `feedback`, fire-and-forget) and log in `docs/artificer-adaptations.md`.
- Diagrams theme via Artificer tokens only (`--dia-*`, `--s-*`, `--accent`); dark-first `.surface-tool`.
- **Mobile/responsive:** shell grid tracks are `minmax(0, 1fr)` — never bare `1fr` (its `auto`
  minimum blocks shrinking; the page blows out sideways). Mobile overrides go *after* the desktop
  rules they override (media queries add no specificity). Verify at 390px with `agent-browser`
  by measuring (`scrollWidth` vs `innerWidth`), not by reading CSS.
