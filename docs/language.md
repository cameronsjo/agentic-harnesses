# Language & Runtime

Three of the four harnesses are TypeScript; code_puppy is the Python outlier. The language choice isn't cosmetic — it shapes how the loop is written, what the dependency posture looks like, and where the tool-call protocol comes from.

## At a glance

| Harness | Language | Runtime / packaging | Defining dependency | UI stack |
|---|---|---|---|---|
| Claude Code | TypeScript | Node · npm | (first-party; Anthropic SDK) | React + Ink (terminal) |
| OpenCode | TypeScript | **Bun** · Effect-TS | **Vercel AI SDK** | client/server |
| pi | TypeScript | Node · npm monorepo | own **unified LLM API** | TUI + web libraries |
| code_puppy | **Python** | **uv** · pyproject | **pydantic-ai** | CLI / REPL |

## How the language shapes the loop

**TypeScript, three ways.** Even among the three TS harnesses, the idiom varies widely:

- **Claude Code** leans on **async generators** — the loop *is* a `yield`ing function, which is what makes streaming output feel native and lets the loop be consumed with `for await`.
- **OpenCode** is written in **Effect-TS**, so the loop is composed of `Effect` values (`Permission.ask` is `Effect.fn(...)`); control flow, error handling, and resource safety are expressed through the effect system rather than plain `async/await`.
- **pi** uses straightforward nested `while` loops over an **EventStream** abstraction — the most conventional of the three to read.

**Python, framework-first.** code_puppy's Python lets it lean entirely on **pydantic-ai**: tools are decorated functions whose JSON schemas are *derived from type hints*, and the agent loop itself is `Agent.run`. The harness writes almost no loop code — the language's typing + a mature agent framework do the heavy lifting. This is the clearest illustration of the "delegate the loop" strategy.

## Dependency posture

- **Claude Code** — heaviest first-party surface: it owns the loop, the tool registry, the permission system, and the TUI. Fewest external agent-framework dependencies; most code.
- **OpenCode** — leans on the **Vercel AI SDK** for model calls + inline tool execution and **Effect-TS** for structure. Provider-agnostic because the SDK is.
- **pi** — builds its *own* unified LLM API as a monorepo package, so it owns provider abstraction rather than importing it. The toolkit ships the agent core, the AI API, and UI libs together.
- **code_puppy** — thinnest harness layer: **pydantic-ai** provides the loop, the tool protocol, schema generation, and provider normalization (`ModelFactory` across OpenAI/Anthropic/Gemini/Bedrock). code_puppy supplies tools, permission callbacks, and a REPL.

## The trade

The TS harnesses that own more (Claude Code, pi) get fine control over retries, compaction, permission placement, and streaming — at the cost of more code to maintain. The harnesses that delegate (OpenCode to the AI SDK, code_puppy to pydantic-ai) get provider-normalization and a smaller surface — at the cost of inheriting the framework's loop shape and its limits. Python's mature typing-plus-framework ecosystem makes the fully-delegated strategy especially natural, which is why the one Python harness is also the one that owns the least of its own loop.

## Related

- [The Loops](loops.md) · [Tool Handling](tool-handling.md) · [Comparison Matrices](comparison.md)
