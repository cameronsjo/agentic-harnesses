# Document a third exclusion category: orchestration layers above the loop

## Context

Cameron handed over four repos to evaluate — `automagik-dev/genie`, `superplanehq/superplane`,
`mindfold-ai/Trellis`, `cosmix/loom`. All four fail this repo's onboarding bar (`docs/methodology.md`:
there must be a real **model → tool dispatch → loop** to reconstruct), and all four fail it for the
*same* reason — a reason the methodology doc has no slot for.

The two documented exclusions are positional: `llm-mux` sits **below** a harness (a provider
router/multiplexer), `openclaw` sits **beside** one (a gateway that routes to other runtimes).
These four sit **above** — they drive Claude Code and Codex as their execution substrate and own no
model call of their own.

The decisive probe was the dependency manifest, and it is worth recording as a method: a thing that
calls a model has a model client. None of the four does.

| Repo | Verified evidence |
|---|---|
| `automagik-dev/genie` (TS, 325★) | Runtime deps are exactly `@inquirer/prompts`, `commander`, `nats`, `zod` — no LLM client. Installs version-matched plugins into Claude Code and Codex; its skills are the methodology, the CLI is state + dispatch. |
| `mindfold-ai/Trellis` (TS, 13k★) | `packages/cli` deps: `chalk`, `commander`, `figlet`, `giget`, `inquirer`, `undici`, `zod`. `packages/core` deps: **none**. Ships `.claude/`, `.codex/`, `.cursor/`, `.opencode/`, `.pi/` adapter dirs — it writes `.trellis/` spec/task/memory files and injects them into ~20 other tools. |
| `cosmix/loom` (Rust, 52★) | `loom/src/claude.rs` is *"Shared Claude binary resolution utilities"* — it locates the `claude` executable on PATH. No LLM client in `Cargo.toml`; `reqwest`+`minisign-verify`+`zip`+`semver` is the self-updater. Installs agents/skills/hooks into `~/.claude/`. |
| `superplanehq/superplane` (Go, 4.3k★) | An event-driven control plane — durable DAG runs, approvals, git-backed apps. LLM is one *component type* beside CI, Kubernetes, and incident tooling. No coding turn loop at all; the furthest from the bar of the four. |

Worth naming in the doc: Trellis's GitHub tagline is literally "The best agent harness" and it carries
the `harness` topic, while its own README calls it "an engineering framework for AI coding" and its
core package has zero dependencies. Three of the four market themselves in harness vocabulary while
being scaffolding *for* a harness. The word has drifted since this repo drew its line — that drift is
the reason the category is worth writing down rather than rejecting these four silently.

**Intended outcome:** a reader (or a future session) who brings up Trellis finds a sourced, one-line
answer instead of re-deriving it.

## Scope

Docs-only, four markdown files. No loop specs, no site changes — there is no UI surface for
exclusions (verified: `grep -rn "excluded\|not onboarded" site/src` returns nothing).

## Plan

### 0. Enter a worktree first

Branch-mode repo, protected primary checkout — the first `Edit` in `/Users/cameron/Projects/agentic-harnesses`
will be blocked. `EnterWorktree` (base `origin/main` is correct here; the session is on `main`), then
push `-u` and open a draft PR per `cadence-forge:using-worktrees` § Session Entry Posture.

**Trap:** a stale worktree already exists at `.claude/worktrees/artificer-0-18` holding a full duplicate
of every file in this plan. Confirm each edit lands in the *new* worktree — re-`Read` each file at the
new path before the first `Edit` there (absolute paths read before entry silently keep editing the
origin checkout).

### 1. `docs/methodology.md` § "Considered but not onboarded"

The section currently reads "Two were evaluated and deliberately excluded" and closes with "Both fail
the model→tool→loop bar." Restructure into two labelled groups, preserving the existing `llm-mux` and
`openclaw` entries verbatim:

- Keep the framing paragraph (the bar, and the anti-pattern of inventing nodes); change the count.
- **Below and beside the loop** — the existing two entries, unchanged.
- **Above the loop** — new group, with a lead sentence naming the pattern: these drive Claude Code and
  Codex as substrate, so the loop being visualized is already onboarded here; profiling them would
  re-describe Claude Code's loop with a different wrapper around it. Then one entry each for `genie`,
  `Trellis`, `loom`, `superplane`, matching the terse two-sentence style of the existing entries and
  carrying the manifest evidence from the Context table above.
- Add the drift observation (Trellis's tagline vs. its own README) as a short closing note — it is the
  reason the group exists.
- Fix the closing line: "Both fail" → "All six fail", keeping the revisit-if-it-grows-a-loop clause.

Also record the **dependency-manifest probe** — a project with no LLM client makes no model calls —
either in this section or in § "What was read". It is the cheapest reliable test for the bar and
currently lives nowhere.

### 2. `docs/comparison.md:3`

Parenthetical currently: "(Two further projects — `llm-mux` and `openclaw` — were evaluated and
excluded…)". Update the count and add the new names; keep the anchor link to
`methodology.md#considered-but-not-onboarded` intact.

### 3. `README.md:22`

Blockquote currently: "Two more from the same wave — **`llm-mux`** … and **`openclaw`** … were
evaluated and **excluded**". Rewrite to cover both groups without bloating the quote — one clause for
the below/beside pair, one for the above-the-loop four, same closing link. Note the four are *not*
"from the same wave" as llm-mux/openclaw; drop or adjust that phrasing.

### 4. `CHANGELOG.md` § `[Unreleased]` → `### Added`

One bullet in the voice of the existing entries: a third exclusion category documented in
`docs/methodology.md` (orchestration layers above the loop), with the four repos named.

## Verification

Docs-only, so the gate is consistency rather than tests:

1. `cd site && npm run build` — full gate (validate-loops + tsc + vite). Should be untouched by this
   change; run it to prove that.
2. `grep -rn "llm-mux\|openclaw\|Two further\|Two more" README.md docs/ CHANGELOG.md` — every count
   phrase updated, no "two"/"both" left describing a six-item list.
3. `grep -c "genie\|Trellis\|loom\|superplane" docs/methodology.md` — confirm the entries actually
   landed in the worktree and not in the origin checkout or the stale `artificer-0-18` worktree.
4. Follow the `methodology.md#considered-but-not-onboarded` anchor from both `README.md` and
   `docs/comparison.md` — the heading text is unchanged, so both should still resolve.
5. `cadence-forge:polish docs` before the PR — this is prose *about* the system, not behavior Claude
   executes, so it routes to the docs variant.

## Notes on process

- **Panel skipped, said out loud:** a four-file prose addition with no logic, no security surface, and
  no new artifact does not warrant a 2–3 seat adversarial plan panel. If Cameron wants one, the seats
  would be `cadence:plan-reviewer` on internal consistency and `cameron-review` on whether the category
  earns its place.
- **Alternatives declined:** (a) *just the read, no repo change* — the finding evaporates and the next
  session re-derives it; (b) *give the above-the-loop layer its own docs page or comparison axis* —
  defensible given Trellis's 13k stars, but it is a different project than "visualize harness loops"
  and would pull the repo's scope sideways. Cameron picked the exclusions-doc route.
