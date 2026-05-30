# Comparison Matrices

Side-by-side comparison of four agentic coding harnesses, grounded in source (see [methodology](methodology.md)). Every characterization here traces to a profile and a `sourceRef` in the [loop specs](../site/src/data/loops/).

## Quick Comparison

| Harness | Language / Runtime | Loop ownership | Tool protocol | Permission gate |
|---|---|---|---|---|
| [Claude Code](harnesses/claude-code.md) | TypeScript · Node · Ink TUI | **Owns** the loop (async generator) | Anthropic-native `tool_use`/`tool_result` | **Loop-level** `canUseTool` |
| [OpenCode](harnesses/opencode.md) | TypeScript · Bun · Effect-TS | **Hybrid** — owns macro step loop; AI SDK owns the step | Vercel AI SDK `tool({execute})` + MCP | **Per-tool** (`ctx.ask`, opt-in) |
| [pi](harnesses/pi.md) | TypeScript · monorepo | **Owns** the loop (dual nested `while`) | Own abstraction; parallel-by-default | **None interactive** (allow-lists + hook) |
| [code_puppy](harnesses/code-puppy.md) | **Python** · pydantic-ai · uv | **Delegates** the loop to pydantic-ai | pydantic-ai `@agent.tool` functions | **Per-tool** in-band callbacks |

## Loop Architecture Matrix

| Aspect | Claude Code | OpenCode | pi | code_puppy |
|---|---|---|---|---|
| **Loop style** | async-generator streaming (`queryLoop`, `while(true)`) | two-layer Effect-TS step loop | dual nested `while` over an EventStream | delegated inner loop + REPL outer loop |
| **Who owns the turn loop** | the harness | harness (macro) + Vercel AI SDK (step) | the harness | pydantic-ai `Agent.run` |
| **Loop entrypoint** | `src/query.ts:241` | `prompt.ts:1252` | `agent-loop.ts:182` | `_runtime.py:349` (call site) |
| **Continuation signal** | no `tool_use` blocks → `end_turn` | last step has no pending tool calls | no pending tool calls / follow-ups | framework returns; outer loop drains steers |
| **Output** | streamed (yielded) | streamed via AI SDK | streamed via EventStream | streamed via `event_stream_handler` |
| **Interrupt handling** | abort signal → synthetic `tool_result`s | `ctx.blocked` → step returns `stop` | steering injections | steering injections between runs |

## Tool Handling & Permission Matrix

| Aspect | Claude Code | OpenCode | pi | code_puppy |
|---|---|---|---|---|
| **Tool registration** | typed `Tool` objects (`src/tools/`) | AI SDK `tool({execute})` from registry + MCP | own tool abstraction | `@agent.tool` Python functions |
| **Schema source** | hand-authored input schemas | AI SDK tool schemas | per-tool schema + `validateToolArguments` | generated from function signatures |
| **Dispatch** | `runTools(batch)` (`query.ts:1382`) | SDK calls `execute` inline during stream | `executeToolCalls` (`agent-loop.ts:373`) | pydantic-ai matches by name, invokes with `RunContext` |
| **Concurrency** | batch per turn | inline during stream | **parallel by default**, order-preserving | framework-driven; prompts serialized by locks |
| **Where permission lives** | **one loop-level gate** | **inside each tool** (opt-in `ctx.ask`) | **nowhere interactive** | **inside each mutating tool** (callbacks) |
| **Real gate exists?** | ✅ `canUseTool` (`QueryEngine.ts:252`) | ✅ ruleset (`permission/index.ts:171`) | ⚠️ allow-lists + `beforeToolCall` hook only | ✅ `on_file_permission` / `get_user_approval` |
| **On denial** | error `tool_result` → model continues | `DeniedError` → error result; interactive reject breaks loop | hook `block:true` → error result | rejection result fed back to model |
| **Bypass** | permission modes (incl. `plan`) | rule `allow` / `experimental.continue_loop_on_deny` | default (no extension = no gate) | YOLO mode / non-interactive stdin |

## Capability Matrix

| Capability | Claude Code | OpenCode | pi | code_puppy |
|---|---|---|---|---|
| **Open source** | ⚠️ (recovered source) | ✅ | ✅ | ✅ |
| **Provider-agnostic** | ❌ (Anthropic) | ✅ (AI SDK) | ✅ (unified AI API) | ✅ (pydantic-ai ModelFactory) |
| **Native MCP** | ✅ | ✅ | ⚠️ (via extensions) | ✅ (pydantic-ai) |
| **Interactive approval** | ✅ | ✅ | ❌ | ✅ |
| **Parallel tool calls** | ⚠️ (batch) | ⚠️ (inline) | ✅ (default) | ⚠️ (framework) |
| **Rich TUI** | ✅ (Ink/React) | ✅ | ✅ (TUI + web libs) | ⚠️ (CLI/REPL) |
| **Plugins / extensions** | ✅ (plugins, hooks, skills) | ⚠️ (MCP) | ✅ (extension runner) | ✅ (plugin callbacks) |
| **Owns its agent loop** | ✅ | ⚠️ (hybrid) | ✅ | ❌ (framework) |

Legend: ✅ full / first-class · ⚠️ partial or indirect · ❌ absent.

## Three Architectural Axes

The four harnesses separate cleanly along three independent axes — which is what makes them worth comparing rather than ranking.

### 1. Who owns the loop?
From **fully owned** (Claude Code's hand-written async generator; pi's dual `while` loops) through **hybrid** (OpenCode owns the macro step loop but hands each model-generation-plus-tool-execution to the Vercel AI SDK) to **fully delegated** (code_puppy hands the entire model→tool→result cycle to pydantic-ai's `Agent.run` and only orchestrates a REPL around it). Owning the loop buys control over retries, compaction, and permission placement; delegating buys provider-normalization and less code.

### 2. Where does permission live?
This is the sharpest divergence. Claude Code puts **one gate in the loop** — every tool passes through `canUseTool`. OpenCode and code_puppy push the gate **into the tools themselves** — each tool decides whether to ask, so coverage is opt-in (OpenCode's MCP tools always ask; its `edit`/`write`/`shell` ask selectively). pi has **no interactive gate at all** by default — safety is a coarse allow-list plus a programmatic `beforeToolCall` hook that only does anything if an extension is installed. None of these is strictly better; they trade uniform safety against flexibility and headless ergonomics.

### 3. Whose tool-call protocol?
Claude Code speaks **Anthropic-native** `tool_use`/`tool_result` directly. The other three delegate the wire protocol to a layer that normalizes across providers — the **Vercel AI SDK** (OpenCode), a **unified AI API** (pi), or **pydantic-ai** (code_puppy) — so they describe tools once and run on many models.

## Related

- [The Loops](loops.md) — the four loops walked through, with links into the visualizer
- [Tool Handling](tool-handling.md) — dispatch and permission models in depth
- [User Interaction](user-interaction.md) — input, streaming, interrupts, sessions
- [Language & Runtime](language.md) — three TypeScript harnesses and one Python outlier
- Per-harness profiles: [Claude Code](harnesses/claude-code.md) · [OpenCode](harnesses/opencode.md) · [pi](harnesses/pi.md) · [code_puppy](harnesses/code-puppy.md)
