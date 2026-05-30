# Changelog

All notable changes to this project are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- Repo scaffold: README, LICENSE (MIT), CONTRIBUTING, docs structure, `.gitignore`.
- Pinned harness sources (gitignored) for analysis: Claude Code (v2.1.88 recovery),
  OpenCode, pi, code_puppy. SHAs recorded in `docs/methodology.md`.
- Loop-spec schema and the node-kind / scenario vocabulary.
- Interactive loop visualizer (`site/`).
- Per-harness profiles and cross-cutting comparison docs.
- Claude Code deep dives: `docs/wire.md` (request/response, prompt caching, system prompt, CLAUDE.md) and `docs/claude-code-events.md` (27 lifecycle events, hook config + control-flow contract).
- Visualizer views: **Hooks & events** (lifecycle hooks overlaid on the Claude Code loop) and **Across the wire** (animated request assembly + streamed response with cache breakpoints).

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
