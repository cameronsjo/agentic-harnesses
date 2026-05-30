# Methodology

How this comparison was produced, and how to reproduce it.

## Principle

Every claim about a harness's loop is grounded in its source code, not its marketing. Each node in a loop spec (`site/src/data/loops/<harness>.json`) carries a `sourceRef` (`path:line`) pointing at the exact code that implements that step. The prose profiles in `docs/harnesses/` follow the same discipline.

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
- Claude Code's source is reconstructed from a source map, so symbol names and structure are faithful but not guaranteed byte-identical to Anthropic's tree.
- Line numbers in `sourceRef`s are valid only at the pinned revision above.
