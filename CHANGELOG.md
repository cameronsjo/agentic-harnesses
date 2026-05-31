# Changelog

All notable changes to this project are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- Four new harnesses onboarded (4 → 8): **Claw Code** (Rust), **claux** (Rust), **Hermes Agent** (Python), **llm-tui** (Rust) — loop specs, profiles, and matrix rows/columns, all source-grounded at pinned SHAs. Documented two **exclusions** (`llm-mux`, `openclaw`) in `docs/methodology.md` for lacking a coding loop of their own.
- Repo scaffold: README, LICENSE (MIT), CONTRIBUTING, docs structure, `.gitignore`.
- Pinned harness sources (gitignored) for analysis: Claude Code (v2.1.88 recovery),
  OpenCode, pi, code_puppy. SHAs recorded in `docs/methodology.md`.
- Loop-spec schema and the node-kind / scenario vocabulary.
- Interactive loop visualizer (`site/`).
- Per-harness profiles and cross-cutting comparison docs.
- Claude Code deep dives: `docs/wire.md` (request/response, prompt caching, system prompt, CLAUDE.md) and `docs/claude-code-events.md` (27 lifecycle events, hook config + control-flow contract).
- Visualizer views: **Hooks & events** (lifecycle hooks overlaid on the Claude Code loop) and **Across the wire** (request assembly + streamed response with cache breakpoints, plus a **curl walkthrough** mode that hand-runs the round-trips).
- **Sequence** view: loop scenarios projected as an animated sequence diagram across User · Agent · Model · Tool lifelines, for any harness.
- Claude Code references are file-level only and framed as leak + speculation (the source is a leaked/recovered snapshot); the three live repos keep reproducible `path:line` refs at pinned SHAs.

### Changed

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
