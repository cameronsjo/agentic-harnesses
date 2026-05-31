# Language & Runtime

Three languages now span the set: **TypeScript** (Claude Code, OpenCode, pi), **Python** (code_puppy, Hermes), and **Rust** (Claw Code, claux, llm-tui). The language choice isn't cosmetic — it shapes how the loop is written, what the dependency posture looks like, and where the tool-call protocol comes from.

## At a glance

| Harness | Language | Runtime / packaging | Defining dependency | UI stack |
|---|---|---|---|---|
| Claude Code | TypeScript | Node · npm | (first-party; Anthropic SDK) | React + Ink (terminal) |
| OpenCode | TypeScript | **Bun** · Effect-TS | **Vercel AI SDK** | client/server |
| pi | TypeScript | Node · npm monorepo | own **unified LLM API** | TUI + web libraries |
| code_puppy | **Python** | **uv** · pyproject | **pydantic-ai** | CLI / REPL |
| Claw Code | **Rust** | Cargo workspace | own `api` crate (Anthropic/OpenAI/xAI) | `claw` REPL |
| claux | **Rust** | Cargo · tokio | own provider trait | REPL + `ratatui` TUI |
| Hermes Agent | **Python** | pip/uv · pyproject | first-party (many providers) | Ink/React TUI over JSON-RPC |
| llm-tui | **Rust** | Cargo | own `LlmProvider` trait | `ratatui` + crossterm |

## How the language shapes the loop

**TypeScript, three ways.** Even among the three TS harnesses, the idiom varies widely:

- **Claude Code** leans on **async generators** — the loop *is* a `yield`ing function, which is what makes streaming output feel native and lets the loop be consumed with `for await`.
- **OpenCode** is written in **Effect-TS**, so the loop is composed of `Effect` values (`Permission.ask` is `Effect.fn(...)`); control flow, error handling, and resource safety are expressed through the effect system rather than plain `async/await`.
- **pi** uses straightforward nested `while` loops over an **EventStream** abstraction — the most conventional of the three to read.

**Python, two postures.** **code_puppy** leans entirely on **pydantic-ai**: tools are decorated functions whose JSON schemas are *derived from type hints*, and the loop itself is `Agent.run` — almost no loop code, the clearest "delegate the loop" example. **Hermes** goes the opposite way in the same language: it hand-writes a ~4,700-line `run_conversation` with its own provider adapters, retry/recovery, and compression — Python used to *own* the loop, not delegate it.

**Rust, hand-written and owned.** All three Rust harnesses write their own loop explicitly — there is no Rust agent framework standing in for pydantic-ai here. **claux** and **Claw Code** are legible `loop {}` turn loops over their own provider/`api` traits; **llm-tui** is an event-driven `ratatui` poll loop. Rust's ownership model pushes them toward explicit control (e.g. claux partitioning read-only tools to run concurrently via `tokio`, Claw Code threading `CancellationToken`s and hook results through the loop) and toward structural safety (llm-tui canonicalizes every path against `$HOME`). The cost is that none of them can "just import a loop" — owning it is the only option Rust really offers.

## Dependency posture

- **Claude Code** — heaviest first-party surface: it owns the loop, the tool registry, the permission system, and the TUI. Fewest external agent-framework dependencies; most code.
- **OpenCode** — leans on the **Vercel AI SDK** for model calls + inline tool execution and **Effect-TS** for structure. Provider-agnostic because the SDK is.
- **pi** — builds its *own* unified LLM API as a monorepo package, so it owns provider abstraction rather than importing it. The toolkit ships the agent core, the AI API, and UI libs together.
- **code_puppy** — thinnest harness layer: **pydantic-ai** provides the loop, the tool protocol, schema generation, and provider normalization (`ModelFactory` across OpenAI/Anthropic/Gemini/Bedrock). code_puppy supplies tools, permission callbacks, and a REPL.
- **Claw Code / claux / llm-tui** — heavy first-party Rust: each owns its loop, tool registry, permission system, and provider abstraction. No agent framework; the only major external deps are async runtimes (`tokio`) and TUI crates (`ratatui`/`crossterm`). Most code, most control.
- **Hermes** — large first-party Python surface (its own adapters for a dozen providers, compression, gateway, skills) despite the language's framework options — closer to Claude Code's "own everything" posture than to code_puppy's.

## The trade

The harnesses that own more (Claude Code, pi, and all three Rust ports, plus Hermes) get fine control over retries, compaction, permission placement, and streaming — at the cost of more code to maintain. The harnesses that delegate (OpenCode to the AI SDK, code_puppy to pydantic-ai) get provider-normalization and a smaller surface — at the cost of inheriting the framework's loop shape and its limits. The language correlates but doesn't determine: Python hosts both the most-delegated harness (code_puppy) and a fully-owned one (Hermes), while Rust — lacking a drop-in agent framework — pushes its three harnesses firmly into the "own the loop" camp.

## Related

- [The Loops](loops.md) · [Tool Handling](tool-handling.md) · [Comparison Matrices](comparison.md)
