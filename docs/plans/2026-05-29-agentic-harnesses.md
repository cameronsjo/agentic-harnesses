# Agentic Harnesses — Comparison + Interactive Loop Visualizer

## Context

Cameron maintains [`cameronsjo/spec-compare`](https://github.com/cameronsjo/spec-compare) — a markdown research repo comparing six **spec-driven development** toolkits (per-tool profiles in `docs/tools/`, cross-cutting matrices in `docs/comparison.md`, an ecosystem survey in `docs/landscape.md`). He wants to **emulate that format for a different subject: agentic coding *harnesses*** — the agent loops themselves.

The new repo lives in the (currently empty) `~/Projects/agentic-harnesses/`. It compares **four harnesses**:

| Harness | Source | Language | Notes |
|---|---|---|---|
| **claude-code** | `~/Projects/forks/claude-code-src` (local) | TypeScript / Ink | v2.1.88 source-map reconstruction. Async-generator streaming loop, `canUseTool` permission gate, `stop_reason`-driven. |
| **opencode** | `anomalyco/opencode` (167K⭐) | TypeScript | "The open source coding agent." |
| **pi** | `earendil-works/pi` (57K⭐) | TypeScript | Monorepo: coding-agent CLI + unified LLM API + TUI/web libs. |
| **code_puppy** | `mpfaffenberger/code_puppy` (556⭐) | Python | The Python outlier — different tool-call protocol. |

**What makes this different from spec-compare:** spec-compare is markdown-only; its "visualizers" are GitHub-rendered tables + ASCII boxes. Here the explicit ask is to **visualize the *loops*** — how each harness runs its agent loop, dispatches tool calls, and handles user interaction. Per the planning decisions, the loop visualizer is a **standalone interactive web app** (animated, side-by-side), backed by deep source-grounded markdown docs.

**Decisions locked in (via planning Q&A):**
1. Visualizer = **interactive web SPA** (animated step-by-step loop player), not Mermaid-in-markdown.
2. External sources = **cloned into `./sources/` (gitignored)** for real source analysis. claude-code reuses the local `forks/` checkout.
3. Breadth = **four harnesses, deep** — no wider landscape survey.

**Intended outcome:** a public-quality repo where (a) the markdown docs deliver spec-compare-style depth on each harness's loop / tool handling / user interaction / language / features, and (b) the web app lets you *watch* and *compare* the four loops running the same scenario.

---

## The Core Abstraction: the Loop Spec (JSON)

Everything hinges on one artifact per harness — a structured **loop spec** that is the output of source analysis and the input to both the web player and the docs. Single source of truth → no drift.

A JSON Schema (`site/src/data/loops/schema.json`) defines it; each harness gets a `*.json` validated against it:

```jsonc
{
  "harness": "claude-code",
  "displayName": "Claude Code",
  "language": "TypeScript",
  "repo": "https://github.com/.../claude-code-src",
  "version": "2.1.88",
  "loopStyle": "async-generator streaming",
  "nodes": [
    { "id": "user-input",    "label": "User message",        "kind": "input",
      "sourceRef": "src/QueryEngine.ts:560", "note": "messagesFromUserInput" },
    { "id": "llm",           "label": "LLM streaming call",  "kind": "llm",      "sourceRef": "..." },
    { "id": "tool-dispatch", "label": "Dispatch tool_use",   "kind": "tool",     "sourceRef": "..." },
    { "id": "approval",      "label": "canUseTool gate",     "kind": "approval", "sourceRef": "src/QueryEngine.ts:252" },
    { "id": "execute",       "label": "Run tool",            "kind": "execute",  "sourceRef": "..." },
    { "id": "stop-check",    "label": "stop_reason?",        "kind": "decision", "sourceRef": "src/QueryEngine.ts:765" },
    { "id": "done",          "label": "end_turn",            "kind": "terminal" }
  ],
  "edges": [
    { "from": "user-input",    "to": "llm" },
    { "from": "llm",           "to": "tool-dispatch", "on": "tool_use" },
    { "from": "llm",           "to": "done",          "on": "end_turn" },
    { "from": "tool-dispatch", "to": "approval" },
    { "from": "approval",      "to": "execute",       "on": "allow" },
    { "from": "approval",      "to": "user-input",    "on": "deny / prompt" },
    { "from": "execute",       "to": "llm",           "label": "tool_result" }
  ],
  "scenarios": [
    { "id": "edit-file",   "title": "User asks to edit a file",
      "steps": ["user-input","llm","tool-dispatch","approval","execute","llm","done"] },
    { "id": "denied-tool", "title": "User denies a tool call",
      "steps": ["user-input","llm","tool-dispatch","approval","user-input"] }
  ]
}
```

- **`kind`** is a fixed vocabulary (`input | llm | tool | approval | execute | decision | terminal`) so the player can color/animate node types consistently across harnesses.
- **`sourceRef`** (`file:line`) ties every node to real code — this is the rigor that separates "the real loop" from "the marketed loop."
- **Shared `scenario.id`s** across all four files (`edit-file`, `denied-tool`, `multi-tool`, `plain-answer`) are what enable the side-by-side comparison view.

---

## Repository Structure

```
agentic-harnesses/
├── README.md                 # overview, 4-harness table, key findings, link to live visualizer
├── CHANGELOG.md  CONTRIBUTING.md  LICENSE   # MIT, mirroring spec-compare
├── .gitignore                # ignores sources/, site/node_modules, site/dist
├── docs/
│   ├── comparison.md         # cross-cutting matrices (the heart, like spec-compare's)
│   ├── loops.md              # side-by-side loop prose; links into the web player
│   ├── tool-handling.md      # tool dispatch + permission/approval models compared
│   ├── user-interaction.md   # input, streaming, interrupts, slash commands, sessions
│   ├── language.md           # TS×3 vs Python: runtime, deps, build, LOC, idioms
│   ├── methodology.md        # exact commit/version of each source + what was read
│   └── harnesses/
│       ├── claude-code.md  opencode.md  pi.md  code-puppy.md   # deep per-harness profiles
├── site/                     # interactive web visualizer (Vite + React + TS)
│   ├── package.json  index.html  vite.config.ts  tsconfig.json
│   └── src/
│       ├── main.tsx  App.tsx
│       ├── LoopPlayer.tsx        # animated stepper for ONE harness loop
│       ├── ScenarioCompare.tsx   # side-by-side N-harness comparison on one scenario
│       ├── LoopGraph.tsx         # node/edge renderer (SVG)
│       ├── data/loops/{schema.json, claude-code.json, opencode.json, pi.json, code-puppy.json}
│       └── theme/                # Artificer design tokens (dark-first)
└── sources/                  # GITIGNORED clones — opencode/, pi/, code_puppy/
```

Loop JSON lives under `site/src/data/loops/` (canonical) so the Vite build imports it with zero path gymnastics; the markdown docs link to those files on GitHub. One source of truth.

---

## Execution Plan (phased — this is a multi-session big lift)

### Phase 0 — Scaffold
- `git init`; create `README.md`, `LICENSE` (MIT), `CONTRIBUTING.md`, `CHANGELOG.md`, `.gitignore` (ignore `sources/`, `site/node_modules`, `site/dist`).
- Create empty `docs/`, `docs/harnesses/`, `site/` skeletons.
- README mirrors spec-compare's shape: overview → four-harness intro → key findings → quick comparison table → links to docs + live visualizer.

### Phase 1 — Obtain sources
- `git clone --depth 1` the three external repos into `sources/{opencode,pi,code_puppy}`.
- claude-code reuses `~/Projects/forks/claude-code-src` (do **not** re-clone).
- Record exact commit SHAs + versions in `docs/methodology.md`.

### Phase 2 — Source analysis → loop specs + profiles (the research core)
Per harness, in order (claude-code first — already understood; it validates the schema):
1. Locate the agent loop entrypoint and tool-dispatch / approval code. Known starting points:
   - **claude-code:** `src/QueryEngine.ts` (async generator, `canUseTool` @ ~252, `stop_reason` @ ~765), `src/query.ts`, `src/Tool.ts`, `src/tools/`.
   - **opencode / pi:** find the session/turn loop + tool registry (TS).
   - **code_puppy:** find the Python agent loop + tool-call parsing (likely OpenAI-style function calling or an agent framework like `pydantic-ai`).
2. Author the validated loop JSON (nodes/edges/scenarios with `sourceRef`s).
3. Write the deep profile `docs/harnesses/<harness>.md` (type, repo, language/runtime, loop architecture, tool-call protocol, permission model, user-interaction model, context/memory, providers, UI, extensibility/MCP, limitations, sources) — following the spec-compare per-tool template (see `docs/tools/openspec.md` as the reference shape).
4. **Ensure all four share the same scenario IDs** (`edit-file`, `denied-tool`, `multi-tool`, `plain-answer`) so the compare view works.

> ⚠️ Loop content for opencode / pi / code_puppy is **derived during this phase**, not assumed. If a harness's real loop doesn't fit the node-kind vocabulary, extend the schema (don't force it) and note the deviation — per plan-execution discipline, a structural surprise is a replan trigger, not a silent adaptation.

### Phase 3 — Cross-cutting docs
Write the comparison layer once all four profiles exist:
- `docs/comparison.md` — quick table + detailed feature matrix + capability matrix (mirror spec-compare's three-matrix structure). Axes: language/runtime, loop architecture, tool-call protocol, tool registry, permission/approval model, user interaction (streaming/interrupt/slash/sessions), context/memory, providers, UI, extensibility/MCP, license/stars/maturity.
- `docs/loops.md`, `docs/tool-handling.md`, `docs/user-interaction.md`, `docs/language.md` — focused deep-dives, each linking to the relevant scenario in the live player.

### Phase 4 — Interactive web visualizer
- Scaffold **Vite + React + TS** in `site/`.
- **Invoke the `artificer-design-system` skill** for the UI — it's explicitly for "agent UIs, terminals" (dark-first, AuDHD-friendly), and this is exactly that.
- Components:
  - `LoopGraph.tsx` — renders a loop spec's nodes/edges as an SVG graph, color-coded by `kind`.
  - `LoopPlayer.tsx` — Play/Step/Reset controls; animates a chosen `scenario` by highlighting nodes/edges in sequence; shows the active node's `sourceRef` + note.
  - `ScenarioCompare.tsx` — pick a scenario ID → render all four harnesses' players side-by-side, stepping together. **This is the headline comparison feature.**
- Validate each loop JSON against `schema.json` at build/test time (e.g. `ajv`), so a malformed spec fails loudly.

### Phase 5 — Wire-up, verify, optional deploy
- README → embed/link the live visualizer; cross-link docs ↔ scenarios.
- Optional: GitHub Pages deploy of `site/dist` (note only; confirm before enabling).

---

## Reuse / References
- **Format template:** `cameronsjo/spec-compare` — `README.md`, `docs/comparison.md` (three-matrix pattern), `docs/tools/openspec.md` (per-tool profile shape), `docs/landscape.md`. Read these for tone/structure; do not copy SDD content.
- **claude-code loop ground truth:** `~/Projects/forks/claude-code-src/src/QueryEngine.ts`, `query.ts`, `Tool.ts`, `tools.ts`, `Task.ts`.
- **Design system:** `artificer-design-system` skill + `~/Projects/artificer-design-system` for the SPA theme.

## Verification (evidence before claims)
- **Sources cloned:** `ls sources/{opencode,pi,code_puppy}` non-empty; SHAs recorded in `methodology.md`.
- **Loop specs valid:** run the ajv validation script — all four `*.json` pass `schema.json`; exit 0.
- **Scenario parity:** a check that all four loop files define the same scenario ID set (the compare view depends on it).
- **Site builds & runs:** `cd site && npm install && npm run build` exits 0; `npm run dev` serves; manually confirm (a) `LoopPlayer` animates a single loop and (b) `ScenarioCompare` steps all four side-by-side on `edit-file` and `denied-tool`.
- **Docs integrity:** every `sourceRef` in the JSON points at a real file:line in the corresponding source; internal doc links resolve.
- **`sourceRef` spot-check:** open 2–3 referenced lines per harness and confirm they are the claimed loop/dispatch/approval site.

## Open / Deferred
- **Visualizer fidelity vs. effort:** start with static node/edge SVG + highlight animation (no fancy physics). Can upgrade later.
- **GitHub Pages deploy:** deferred; confirm before enabling.
- **Wider landscape survey** (aider/codex/gemini-cli/goose): explicitly out of scope for v1 per the breadth decision; could become a `docs/landscape.md` later.
