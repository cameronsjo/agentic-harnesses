---
name: onboard-harness
description: Use when adding a new agentic coding harness to this comparison repo — clone its source, reconstruct its loop as a validated JSON spec, write its profile, and wire it into the matrices. Covers the full source-to-spec pipeline.
---

# Onboard a Harness

Add a new harness so it appears in the visualizer and the docs. The work is **source analysis → one validated loop spec → one profile doc → matrix updates**. The loop spec is the single source of truth — the visualizer and docs both read it, so it cannot drift.

**Announce at start:** "Using onboard-harness to add `<harness>` to the comparison."

## The contract you must satisfy

1. `site/src/data/loops/<harness>.json` validates against `site/src/data/loops/schema.json`.
2. It defines all four shared scenarios — `edit-file`, `denied-tool`, `multi-tool`, `plain-answer` — by id. Parity is **enforced**: `validate-loops.mjs` fails the build if any harness is missing one.
3. `cd site && npm run build` exits 0 (validate + tsc + vite).

Everything else (appearing in Compare / Single / Sequence views) happens automatically — `site/src/data.ts` auto-discovers every `loops/*.json` via `import.meta.glob`. **You never edit a component to register a harness.** (The Wire and Hooks views are Claude-Code-only by design; ignore them.)

## Step 1 — Obtain the source

External repos clone into the **gitignored** `sources/` dir, shallow:

```bash
git clone --depth 1 <repo-url> sources/<harness>
git -C sources/<harness> rev-parse HEAD   # record this SHA
```

Record the exact **SHA + version** in `docs/methodology.md` alongside the others.

> **Claude Code is special.** It is a leaked/recovered snapshot, not a live repo. Its refs are **file-level only** (no line numbers), and every claim is framed as *"based on Claude Code <version> Leak and speculation."* The three live repos keep reproducible `path:line` refs pinned to the recorded SHA. Do not mix these conventions.

## Step 2 — Find the loop

Read the source and locate, with a real `file:line` for each:

- **Loop entrypoint** — where the turn/agent loop runs (often an async generator, a `while`, or a delegated `Agent.run`).
- **Model call** — where it streams/calls the LLM.
- **Tool dispatch** — where a `tool_use` / function call is turned into an execution.
- **Permission/approval gate** — where (or whether) the user can allow/deny a tool. Some harnesses have none — that is a finding, not a gap to invent.
- **Stop/continue decision** — what makes the loop iterate vs. end the turn (`stop_reason`, etc.).

If the real loop doesn't fit the node-kind vocabulary, **extend the schema and note the deviation** — do not force the loop into the wrong shape. A structural surprise is worth surfacing.

## Step 3 — Author the loop spec

Write `site/src/data/loops/<harness>.json`. Shape (authority is `schema.json` — read it, don't trust this sketch):

- **Top-level:** `harness`, `displayName`, `language`, `repo`, `version`, `loopStyle`.
- **`nodes[]`:** each `{ id, label, kind, sourceRef?, note? }`. `kind` is the fixed vocabulary: `input | llm | tool | approval | execute | decision | terminal`. The colors/animation in the visualizer key off `kind`, so use it honestly.
- **`edges[]`:** `{ from, to, on?, label? }` — `on` is the branch condition (e.g. `tool_use`, `end_turn`, `allow`, `deny`).
- **`scenarios[]`:** each `{ id, title, steps: [...nodeIds], note? }`. **Must include the four shared ids.** `steps` is the ordered node walk the player animates.

`sourceRef` ties a node to real code — this is the rigor that separates the real loop from the marketed one. Live repos: `path:line`. Claude Code: file-level, leak-framed.

## Step 4 — Write the profile

Create `docs/harnesses/<harness>.md` following the shape of the existing profiles (read one first — e.g. `docs/harnesses/opencode.md`). Cover: type, repo/language/runtime, loop architecture, tool-call protocol, permission model, user-interaction model, context/memory, providers, UI, extensibility/MCP, limitations, sources.

## Step 5 — Update the cross-cutting layer

- `README.md` — add a row to the four-harness table (it becomes five+).
- `docs/comparison.md` — extend each matrix with the new column.
- `CHANGELOG.md` — add a line under `[Unreleased]`.
- Any deep-dive in `docs/` (loops, tool-handling, user-interaction, language) where the new harness changes the comparison.

## Step 6 — Verify (evidence, not vibes)

```bash
cd site && npm run build
```

Confirm in the output:
- `✓ <harness>.json — N nodes, M edges, 4 scenarios`
- `✓ scenario-id parity across <N> harnesses: [...]` — the new harness is included.
- tsc + vite build succeed.

Then **spot-check 2–3 `sourceRef`s** by opening the cited `file:line` in `sources/<harness>/` and confirming it is actually the loop/dispatch/approval site claimed. Run `npm run dev` and watch the new harness step through `edit-file` and `denied-tool` in the Compare view.

## Anti-patterns

- **Inventing an approval gate** a harness doesn't have. Model what's there; absence is a result.
- **Editing a component to register the harness.** Glob discovery does it; if it's not showing up, the JSON failed validation or lacks a `harness` field.
- **Line numbers on Claude Code refs.** File-level + leak framing only.
- **Skipping the sourceRef spot-check.** Unverified refs are the one thing that quietly rots this repo's credibility.
