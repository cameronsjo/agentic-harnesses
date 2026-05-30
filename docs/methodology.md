# Methodology

How this comparison was produced, and how to reproduce it.

## Principle

Every claim about a harness's loop is grounded in its source code, not its marketing. Each node in a loop spec (`site/src/data/loops/<harness>.json`) carries a `sourceRef`, and the prose profiles in `docs/harnesses/` follow the same discipline.

**Two reference styles, by source provenance:**

- **OpenCode, pi, code_puppy** are live open-source repos pinned to exact SHAs (below). Their refs are `path:line` and are reproducible — check out the SHA and the line is there.
- **Claude Code** is studied from a **leaked / recovered** source snapshot that is already somewhat old. Its refs are deliberately **file-level only** (no line numbers), and its internals should be read as **"based on the Claude Code leak + informed speculation"** — indicative of how the shipped CLI behaves, not an authoritative or current account. Anthropic has not published this source; treat specifics as best-effort reconstruction.

## Pinned sources

Harness sources are analyzed **in place** under `sources/` (gitignored) and never vendored into this repo. To reproduce the analysis, check out these exact revisions:

| Harness | Repo | Revision (analyzed) | Version | Language |
|---|---|---|---|---|
| Claude Code | `github.com/ponponon/claude_code_src` (mirror of `@anthropic-ai/claude-code`) | local `forks/claude-code-src` | 2.1.88 (source-map recovery) | TypeScript / Ink |
| OpenCode | `github.com/anomalyco/opencode` | `b2a06351b545dbefa30181016696ca25110b2366` | (HEAD, 2026-05-29) | TypeScript (Bun) |
| pi | `github.com/earendil-works/pi` | `dbb9911a547f697229e4e90c9a071794db315e5e` | (HEAD, 2026-05-29) | TypeScript |
| code_puppy | `github.com/mpfaffenberger/code_puppy` | `ccde401a159ebbc17cf253a0c0ff24944a23ad33` | (HEAD, 2026-05-29) | Python |

Reproduce:

```bash
mkdir -p sources && cd sources
git clone https://github.com/anomalyco/opencode.git        && git -C opencode   checkout b2a06351
git clone https://github.com/earendil-works/pi.git         && git -C pi         checkout dbb9911a
git clone https://github.com/mpfaffenberger/code_puppy.git && git -C code_puppy checkout ccde401a
```

Claude Code is a source-map reconstruction of `@anthropic-ai/claude-code@2.1.88` (the published `cli.js.map` allowed full source recovery). It is studied as a faithful-but-reconstructed view of the real CLI.

## What was read

For each harness: the agent loop entrypoint (turn/session loop), the model-call path, the tool registry and dispatch path, and the permission/approval gate. Specific files are cited inline in each profile and in the loop specs' `sourceRef`s.

## Caveats

- These are large, fast-moving codebases pinned to a single revision. Behavior may have changed since.
- **Claude Code is the leaked/recovered snapshot — leak + speculation.** Symbol names and structure are best-effort reconstruction, not guaranteed to match Anthropic's tree, and the snapshot is older than current Claude Code. File-level refs only; no line numbers. Don't quote it as authoritative.
- Line numbers in the other three harnesses' `sourceRef`s are valid only at the pinned SHA above.
