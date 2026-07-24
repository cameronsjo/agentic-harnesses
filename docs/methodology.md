# Methodology

How this comparison was produced, and how to reproduce it.

## Principle

Every claim about a harness's loop is grounded in its source code, not its marketing. Each node in a loop spec (`site/src/data/loops/<harness>.json`) carries a `sourceRef`, and the prose profiles in `docs/harnesses/` follow the same discipline.

**Two reference styles, by source provenance:**

- **OpenCode, pi, code_puppy, claw-code, claux, hermes, llm-tui** are live open-source repos pinned to exact SHAs (below). Their refs are `path:line` and are reproducible — check out the SHA and the line is there.
- **Claude Code** is studied from a **leaked / recovered** source snapshot that is already somewhat old. Its refs are deliberately **file-level only** (no line numbers), and its internals should be read as **"based on the Claude Code leak + informed speculation"** — indicative of how the shipped CLI behaves, not an authoritative or current account. Anthropic has not published this source; treat specifics as best-effort reconstruction.

## Pinned sources

Harness sources are analyzed **in place** under `sources/` (gitignored) and never vendored into this repo. To reproduce the analysis, check out these exact revisions:

| Harness | Repo | Revision (analyzed) | Version | Language |
|---|---|---|---|---|
| Claude Code | `github.com/ponponon/claude_code_src` (mirror of `@anthropic-ai/claude-code`) | local `forks/claude-code-src` | 2.1.88 (source-map recovery) | TypeScript / Ink |
| OpenCode | `github.com/anomalyco/opencode` | `b2a06351b545dbefa30181016696ca25110b2366` | (HEAD, 2026-05-29) | TypeScript (Bun) |
| pi | `github.com/earendil-works/pi` | `dbb9911a547f697229e4e90c9a071794db315e5e` | (HEAD, 2026-05-29) | TypeScript |
| code_puppy | `github.com/mpfaffenberger/code_puppy` | `ccde401a159ebbc17cf253a0c0ff24944a23ad33` | (HEAD, 2026-05-29) | Python |
| Claw Code | `github.com/ultraworkers/claw-code` | `4d3dc5b873680504aeeffe43f454278588368982` | (HEAD, 2026-05-31) | Rust |
| claux | `github.com/ducks/claux` | `d906c568c6f48cd4dacc1f1d9dceda790d39ddda` | (HEAD, 2026-05-31) | Rust |
| Hermes Agent | `github.com/NousResearch/hermes-agent` | `02d1da49de5086946256cc157ff928dcffbe8ca1` | (HEAD, 2026-05-31) | Python |
| llm-tui | `github.com/ducks/llm-tui` | `384a880baf5de534de38a3076cb9204520a97895` | (HEAD, 2026-05-31) | Rust |

Reproduce:

```bash
mkdir -p sources && cd sources
git clone https://github.com/anomalyco/opencode.git          && git -C opencode   checkout b2a06351
git clone https://github.com/earendil-works/pi.git           && git -C pi         checkout dbb9911a
git clone https://github.com/mpfaffenberger/code_puppy.git   && git -C code_puppy checkout ccde401a
git clone https://github.com/ultraworkers/claw-code.git      && git -C claw-code  checkout 4d3dc5b8
git clone https://github.com/ducks/claux.git                 && git -C claux      checkout d906c568
git clone https://github.com/NousResearch/hermes-agent.git   && git -C hermes-agent checkout 02d1da49
git clone https://github.com/ducks/llm-tui.git               && git -C llm-tui    checkout 384a880b
```

Claude Code is a source-map reconstruction of `@anthropic-ai/claude-code@2.1.88` (the published `cli.js.map` allowed full source recovery). It is studied as a faithful-but-reconstructed view of the real CLI.

## What was read

For each harness: the agent loop entrypoint (turn/session loop), the model-call path, the tool registry and dispatch path, and the permission/approval gate. Specific files are cited inline in each profile and in the loop specs' `sourceRef`s.

## Considered but not onboarded

Not every project marketed as a coding agent models cleanly as a coding loop. The bar for onboarding is concrete: there must be a real **model → tool dispatch → loop** to reconstruct. A project that has no turn loop, no tool dispatch, and no approval gate cannot be profiled without **inventing** nodes — and inventing structure is exactly the anti-pattern this repo exists to avoid. Five were evaluated and deliberately excluded. What separates them is positional — where each sits relative to the loop it is not.

**The dependency-manifest probe.** The cheapest reliable test for the bar is the project's own manifest: a thing that calls a model has a model client. Open `package.json` / `Cargo.toml` / `go.mod` and look for an Anthropic, OpenAI, Vercel AI SDK, or equivalent HTTP-to-a-model dependency. If none is there, the project is not making model calls — it is wrapping something that does, and the loop worth visualizing belongs to that something. The probe is fast and hard to argue with, and it decided three of the five exclusions below.

These manifest reads were taken on **2026-07-23**. They are point-in-time measurements, not structural facts, and the same caveat that applies to the pinned harness sources applies here — `genie` carried `@anthropic-ai/claude-agent-sdk` until its v5 rewrite deliberately stripped it. Re-run the probe before relying on any of them.

### Below and beside the loop

- **`llm-mux`** — a provider **router / multiplexer**. It load-balances and fails over between LLM backends behind one endpoint. There is no turn loop, no tool dispatch, and no approval gate; it sits *below* a harness, not beside one. Onboarding it would mean fabricating a loop it does not have.
- **`openclaw`** — a **gateway that delegates** coding to external agents. It routes requests to other runtimes rather than running its own model→tool→loop cycle. The coding loop lives in whatever agent it dispatches to, so there is nothing of its own to reconstruct; profiling it would just re-describe its delegates.

### Above the loop

These are **orchestration layers**: they drive an existing coding harness as their execution substrate — installing plugins, skills, and hooks into Claude Code and Codex, then dispatching work at them. The turn loop belongs to the substrate, not to the layer. Where that substrate is Claude Code, the loop is already onboarded here, so profiling the layer would reproduce that same spec with a different wrapper drawn around it; where it is Codex, the loop is [out of scope](../README.md#scope) for this repo entirely. Either way the layer has nothing of its own to reconstruct.

- **`automagik-dev/genie`** (TypeScript) — a workflow CLI whose runtime dependencies are exactly `@inquirer/prompts`, `commander`, `nats`, and `zod`; no LLM client anywhere. It installs version-matched plugins into Claude Code and Codex, so its skills are the methodology and its CLI is state plus dispatch. The model call it orchestrates is Claude Code's.
- **`mindfold-ai/Trellis`** (TypeScript) — a spec/task/memory framework that writes `.trellis/` files and injects them into roughly twenty other tools via committed `.claude/`, `.codex/`, `.cursor/`, `.opencode/`, and `.pi/` adapter directories. `packages/cli` depends on `chalk`, `commander`, `figlet`, `giget`, `inquirer`, `undici`, and `zod`; `packages/core` has **no dependencies at all**. It is scaffolding *for* a harness, and every harness it targets supplies the loop.
- **`cosmix/loom`** (Rust) — an installer for agents, skills, and hooks into `~/.claude/`. Its `loom/src/claude.rs` is described in its own header as *"Shared Claude binary resolution utilities"* — it locates the `claude` executable on `PATH` rather than calling a model; the `reqwest` / `minisign-verify` / `zip` / `semver` cluster in `loom/Cargo.toml` is the self-updater, not an API client. The loop is Claude Code's, unchanged.
A note on why this group needs naming at all: one of the three — much the largest — describes itself in harness vocabulary. Trellis's GitHub description is literally "The best agent harness." and it carries the `harness` topic, while its own README opens "An out-of-the-box engineering framework for AI coding… so any coding agent works to your engineering standards." Its own prose agrees with the exclusion; only the tagline reaches for the word. The other two self-describe as an *orchestrator* (`loom`) and a *CLI agent* (`genie`) — closer to the vocabulary this section uses than to "harness." So the drift is narrow but real, and it points at the most visible project of the set, which is reason enough to state the exclusion rather than assume it.

All five fail the model→tool→loop bar. Their honest deliverable is this documented exclusion, not a manufactured spec. If any grows a real coding loop later, it can be revisited against the same bar.

## Caveats

- These are large, fast-moving codebases pinned to a single revision. Behavior may have changed since.
- **Claude Code is the leaked/recovered snapshot — leak + speculation.** Symbol names and structure are best-effort reconstruction, not guaranteed to match Anthropic's tree, and the snapshot is older than current Claude Code. File-level refs only; no line numbers. Don't quote it as authoritative.
- Line numbers in the live harnesses' `sourceRef`s (everything except Claude Code) are valid only at the pinned SHA above.
