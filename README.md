# Agentic Harnesses Comparison

A source-grounded comparison of eight agentic **coding harnesses** — the agent loops that turn an LLM into a coding assistant. Where most comparisons stop at feature checklists, this one reads the actual source of each harness and reconstructs **how its loop runs**: how it calls the model, dispatches tool calls, gates them for permission, and hands control back to you.

It ships with an **interactive visualizer** (`site/`) that animates each loop step-by-step and plays the same scenario across all eight harnesses side-by-side — so you can *watch* how each one handles, say, an edit it needs your approval for.

> Sibling project to [`spec-compare`](https://github.com/cameronsjo/spec-compare), which compares spec-driven *development* toolkits. This repo compares the *execution* layer underneath them.

## The Eight Harnesses

| Harness | Repo | Language | Stars | Why it's here |
|---|---|---|---|---|
| **Claude Code** | [`claude-code-src`](https://github.com/ponponon/claude_code_src) (v2.1.88 recovery) | TypeScript / Ink | — | Anthropic's CLI agent. Async-generator streaming loop with a `canUseTool` permission gate. |
| **OpenCode** | [`anomalyco/opencode`](https://github.com/anomalyco/opencode) | TypeScript | 167K | "The open source coding agent." Client/server split, provider-agnostic. |
| **pi** | [`earendil-works/pi`](https://github.com/earendil-works/pi) | TypeScript | 57K | Monorepo toolkit: coding-agent CLI + unified LLM API + TUI/web libraries. |
| **code_puppy** | [`mpfaffenberger/code_puppy`](https://github.com/mpfaffenberger/code_puppy) | Python | 556 | A Python outlier — a different language and a different tool-call protocol. |
| **Claw Code** | [`ultraworkers/claw-code`](https://github.com/ultraworkers/claw-code) | Rust | — | Claude-Code-parity Rust port. The most elaborate gate here — sandbox modes + per-tool rules + Pre/PostToolUse hooks. Marketing runs hot; the loop is real. |
| **claux** | [`ducks/claux`](https://github.com/ducks/claux) | Rust | — | Clean Claude-Code reimplementation: a single legible turn loop, 4 permission modes (`default`/`accept-edits`/`bypass`/`plan`), parallel read-only tools. |
| **Hermes Agent** | [`NousResearch/hermes-agent`](https://github.com/NousResearch/hermes-agent) | Python | — | The structural outlier: a normal per-turn loop **plus** a self-improving skill/memory meta-loop that runs *between* turns. Gates only dangerous shell commands. |
| **llm-tui** | [`ducks/llm-tui`](https://github.com/ducks/llm-tui) | Rust | — | The maximal-approval baseline: an event-driven TUI where **every** tool call waits for a `y/n/a/q` keypress, home-sandboxed by construction. |

> Two more from the same wave — **`llm-mux`** (a provider router/multiplexer) and **`openclaw`** (a gateway that delegates coding to external agents) — were evaluated and **excluded**: neither has a model→tool→loop of its own to reconstruct. See [methodology → Considered but not onboarded](docs/methodology.md#considered-but-not-onboarded).

## The Loop, as a First-Class Object

Each harness's loop is reconstructed into a structured **loop spec** (`site/src/data/loops/<harness>.json`) — nodes, edges, and scenarios, every node tied back to a real `file:line` in the harness source. That one artifact drives both the prose docs and the visualizer, so they can't drift.

The node vocabulary is fixed so all eight are comparable:

| Kind | Meaning |
|---|---|
| `input` | A user message enters the loop |
| `llm` | A call to the model |
| `tool` | A tool call is dispatched |
| `approval` | A permission / approval gate |
| `execute` | The tool actually runs |
| `decision` | A branch (e.g. "more tool calls, or done?") |
| `terminal` | The turn ends |

Every harness defines the same **scenarios** — `edit-file`, `denied-tool`, `multi-tool`, `plain-answer` — which is what makes the side-by-side comparison meaningful.

## Documentation

### Per-Harness Profiles
- [Claude Code](docs/harnesses/claude-code.md)
- [OpenCode](docs/harnesses/opencode.md)
- [pi](docs/harnesses/pi.md)
- [code_puppy](docs/harnesses/code-puppy.md)
- [Claw Code](docs/harnesses/claw-code.md)
- [claux](docs/harnesses/claux.md)
- [Hermes Agent](docs/harnesses/hermes.md)
- [llm-tui](docs/harnesses/llm-tui.md)

### Cross-Cutting Analysis
- [Comparison Matrices](docs/comparison.md) — side-by-side feature, capability, and architecture tables
- [The Loops](docs/loops.md) — agent loops compared, with links into the visualizer
- [Tool Handling](docs/tool-handling.md) — dispatch, registries, and permission/approval models
- [User Interaction](docs/user-interaction.md) — input, streaming, interrupts, slash commands, sessions
- [Language & Runtime](docs/language.md) — TypeScript, Python, and Rust harnesses across the set
- [Methodology](docs/methodology.md) — exact sources, versions, and what was read

### Claude Code Deep Dives
- [What Goes Across the Wire](docs/wire.md) — the `/v1/messages` request: API client, tool-call protocol, prompt caching (`cache_control` placement), system-prompt assembly, CLAUDE.md loading
- [Events & Hooks](docs/claude-code-events.md) — all 27 lifecycle events, the settings.json config schema, the exit-code/JSON control-flow contract, and where each fires on the loop

## Interactive Visualizer

The `site/` app animates each loop and compares scenarios across harnesses. Navigation: a sidenav lists "Compare all" or a harness; within a harness, tabs switch between:

- **Compare all** — every harness runs the same scenario, stepped in lockstep
- **Loop** — one harness's loop with transport controls and a node inspector
- **Sequence** — the same scenarios projected as an animated sequence diagram (User · Agent · Model · Tool lifelines)
- **Hooks & events** — Claude Code's lifecycle hooks overlaid on its loop (click a node to see what fires) — Claude Code only
- **Across the wire** — Claude Code's request/response, as a **curl walkthrough** (hand-run the round-trips) or a layered request-assembly view, with cache breakpoints — Claude Code only

```bash
cd site
npm install
npm run dev
```

## Scope

Eight harnesses, analyzed deeply — not a survey of the wider field. A broader landscape (aider, Codex CLI, Gemini CLI, Goose, Crush, …) is explicitly out of scope. Projects without a coding loop of their own (routers, gateways) are documented as exclusions rather than profiled — see [methodology](docs/methodology.md#considered-but-not-onboarded).

## License

[MIT](LICENSE). Harness sources are analyzed in place and never vendored into this repo (see [methodology](docs/methodology.md)).

---

**Last Updated:** 2026-05-31
