# Changelog

All notable changes to this project are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- **Pan / zoom / fit controls** on the Loop, Hooks, and Sequence diagram panels (#3): drag to pan, ctrl-or-pinch wheel and +/− to zoom, Fit to reframe, all keyboard-reachable. Implemented as a content-agnostic `GraphViewport` that transforms a wrapper rather than the SVG's `viewBox`, so the diagrams stay pure renderers and the same frame can mount around the compare row for #7. Pan/zoom math is pure and unit-tested in `site/src/viewport.ts`.
- A **social preview image for this project** (`site/public/og-image.{svg,png}`), replacing the design system's own marketing card that the site had inherited by pointing at the vendored package assets.
- Four new harnesses onboarded (4 → 8): **Claw Code** (Rust), **claux** (Rust), **Hermes Agent** (Python), **llm-tui** (Rust) — loop specs, profiles, and matrix rows/columns, all source-grounded at pinned SHAs. Documented two **exclusions** (`llm-mux`, `openclaw`) in `docs/methodology.md` for lacking a coding loop of their own.
- A third **exclusion** category in `docs/methodology.md` — *orchestration layers above the loop*: **`genie`**, **`Trellis`**, and **`loom`** drive Claude Code and Codex as their execution substrate and own no model call, so the loop worth visualizing belongs to the substrate — already onboarded here in Claude Code's case, out of scope in Codex's. Records the **dependency-manifest probe** (a project that calls a model has a model client) as the test that decided all three, dated so the reads can be re-run.
- Repo scaffold: README, LICENSE (MIT), CONTRIBUTING, docs structure, `.gitignore`.
- Pinned harness sources (gitignored) for analysis: Claude Code (v2.1.88 recovery),
  OpenCode, pi, code_puppy. SHAs recorded in `docs/methodology.md`.
- Loop-spec schema and the node-kind / scenario vocabulary.
- Interactive loop visualizer (`site/`).
- Per-harness profiles and cross-cutting comparison docs.
- Claude Code deep dives: `docs/wire.md` (request/response, prompt caching, system prompt, CLAUDE.md) and `docs/claude-code-events.md` (27 lifecycle events, hook config + control-flow contract).
- Visualizer views: **Hooks & events** (lifecycle hooks overlaid on the Claude Code loop) and **Across the wire** (request assembly + streamed response with cache breakpoints, plus a **curl walkthrough** mode that hand-runs the round-trips).
- **Sequence** view: loop scenarios projected as an animated sequence diagram across User · Agent · Model · Tool lifelines, for any harness.
- **Expandable diagrams:** Loop, Sequence, and Hooks each enlarge to a modal (shared `GraphModal` + `ExpandButton`), mobile-friendly as a full-screen sheet, with the view's controls/inspector carried into the enlarged view.
- **Disclaimer footer:** independence/provenance, attribution, a Claude Code bias disclosure, and a no-affiliation legal notice — a two-column band with full-width fine print.
- Two handoff docs: `docs/artificer-spa-consumer-brief.md` (consuming Artificer in a React SPA) and `docs/disclaimer-footer-pattern.md` (the honest-footer content + layout pattern).
- Claude Code references are file-level only and framed as leak + speculation (the source is a leaked/recovered snapshot); the three live repos keep reproducible `path:line` refs at pinned SHAs.

### Changed

- Visualizer: brought the **Across the wire**, **Sequence**, and **curl walkthrough** views onto the shared design language — they predated it and still wore the older surface. Hand-rolled cards replaced by the `.card` primitive, tag rows by `.cluster`, and anchor words added to the 10 wire notes and 4 curl annotations that carried none.
- Visualizer: applied the Artificer design system properly within the existing
  layout — a masthead (kicker / wordmark / lede / meta badges), anchor words
  across prose, system `.card` / `.container--lg` / `.dot` utilities replacing
  hand-rolled styles, a `.skip-link` to the main region, and favicon + OG/twitter
  metadata. Loop-spec `note` / `title` prose now supports `**…**` anchor markers,
  rendered as `<b class="anchor">`.
- Visualizer: layered the Artificer v0.8.0 "Whimsy" shimmer (the `ultrathink`
  look). The wordmark breathes the spectrum once on load and then settles; a
  "turn complete" caption shimmers once when a played scenario reaches its
  terminal node, in both the single and side-by-side players.
- Visualizer: upgraded the vendored Artificer design system from **v0.6 → v0.10.1**
  (full re-vendor of `site/public/artificer/` from canonical `src/`; Whimsy now
  v0.10.0). Adds `--art-version` provenance, the v0.9.0 baseline-contract tokens,
  and focus / breakpoint / nav primitives. Added an inline FOUC theme bootstrap in
  `site/index.html` so the dark-first page no longer risks a theme flash on reload,
  and `scripts/revendor-artificer.sh` to reproduce the fetch. See
  `docs/artificer-adaptations.md`.

### Fixed

- **Social preview cards rendered with no image.** Both `og:image` and `twitter:image` pointed at an SVG, a format X and LinkedIn reject outright. Now a 1200×630 PNG at an absolute URL, with the `og:url` / `og:image:type` / `width` / `height` / `alt` tags that were missing.
- **Site metadata still said four harnesses** in three places (`description`, `og:description`, `twitter:description`) and named only the original four, when eight ship in `site/src/data/loops/`. The pass that corrected stale counts in `CONTRIBUTING.md` and `docs/wire.md` missed `site/index.html`.
- **The Sequence view printed literal `**` asterisks** in its message inspector. Its notes come from the loop spec's `node.note`, which carries anchor markers — the Loop view renders the identical strings through `Anchored`, so the two views disagreed on the same data.
