# Agentic Harnesses Comparison

A source-grounded comparison of four agentic **coding harnesses** — the agent loops that turn an LLM into a coding assistant. Where most comparisons stop at feature checklists, this one reads the actual source of each harness and reconstructs **how its loop runs**: how it calls the model, dispatches tool calls, gates them for permission, and hands control back to you.

It ships with an **interactive visualizer** (`site/`) that animates each loop step-by-step and plays the same scenario across all four harnesses side-by-side — so you can *watch* how each one handles, say, an edit it needs your approval for.

> Sibling project to [`spec-compare`](https://github.com/cameronsjo/spec-compare), which compares spec-driven *development* toolkits. This repo compares the *execution* layer underneath them.

## The Four Harnesses

| Harness | Repo | Language | Stars | Why it's here |
|---|---|---|---|---|
| **Claude Code** | [`claude-code-src`](https://github.com/ponponon/claude_code_src) (v2.1.88 recovery) | TypeScript / Ink | — | Anthropic's CLI agent. Async-generator streaming loop with a `canUseTool` permission gate. |
| **OpenCode** | [`anomalyco/opencode`](https://github.com/anomalyco/opencode) | TypeScript | 167K | "The open source coding agent." Client/server split, provider-agnostic. |
| **pi** | [`earendil-works/pi`](https://github.com/earendil-works/pi) | TypeScript | 57K | Monorepo toolkit: coding-agent CLI + unified LLM API + TUI/web libraries. |
| **code_puppy** | [`mpfaffenberger/code_puppy`](https://github.com/mpfaffenberger/code_puppy) | Python | 556 | The Python outlier — a different language and a different tool-call protocol. |

## The Loop, as a First-Class Object

Each harness's loop is reconstructed into a structured **loop spec** (`site/src/data/loops/<harness>.json`) — nodes, edges, and scenarios, every node tied back to a real `file:line` in the harness source. That one artifact drives both the prose docs and the visualizer, so they can't drift.

The node vocabulary is fixed so the four are comparable:

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

### Cross-Cutting Analysis
- [Comparison Matrices](docs/comparison.md) — side-by-side feature, capability, and architecture tables
- [The Loops](docs/loops.md) — agent loops compared, with links into the visualizer
- [Tool Handling](docs/tool-handling.md) — dispatch, registries, and permission/approval models
- [User Interaction](docs/user-interaction.md) — input, streaming, interrupts, slash commands, sessions
- [Language & Runtime](docs/language.md) — three TypeScript harnesses and one Python outlier
- [Methodology](docs/methodology.md) — exact sources, versions, and what was read

## Interactive Visualizer

The `site/` app animates each loop and compares scenarios across harnesses.

```bash
cd site
npm install
npm run dev
```

## Scope

Four harnesses, analyzed deeply — not a survey of the wider field. A broader landscape (aider, Codex CLI, Gemini CLI, Goose, Crush, …) is explicitly out of scope for v1.

## License

[MIT](LICENSE). Harness sources are analyzed in place and never vendored into this repo (see [methodology](docs/methodology.md)).

---

**Last Updated:** 2026-05-29
