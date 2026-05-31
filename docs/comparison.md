# Comparison Matrices

Side-by-side comparison of eight agentic coding harnesses, grounded in source (see [methodology](methodology.md)). Every characterization here traces to a profile and a `sourceRef` in the [loop specs](../site/src/data/loops/). (Two further projects — `llm-mux` and `openclaw` — were [evaluated and excluded](methodology.md#considered-but-not-onboarded) for lacking a coding loop of their own.)

## Quick Comparison

| Harness | Language / Runtime | Loop ownership | Tool protocol | Permission gate |
|---|---|---|---|---|
| [Claude Code](harnesses/claude-code.md) | TypeScript · Node · Ink TUI | **Owns** the loop (async generator) | Anthropic-native `tool_use`/`tool_result` | **Loop-level** `canUseTool` |
| [OpenCode](harnesses/opencode.md) | TypeScript · Bun · Effect-TS | **Hybrid** — owns macro step loop; AI SDK owns the step | Vercel AI SDK `tool({execute})` + MCP | **Per-tool** (`ctx.ask`, opt-in) |
| [pi](harnesses/pi.md) | TypeScript · monorepo | **Owns** the loop (dual nested `while`) | Own abstraction; parallel-by-default | **None interactive** (allow-lists + hook) |
| [code_puppy](harnesses/code-puppy.md) | **Python** · pydantic-ai · uv | **Delegates** the loop to pydantic-ai | pydantic-ai `@agent.tool` functions | **Per-tool** in-band callbacks |
| [Claw Code](harnesses/claw-code.md) | **Rust** · Cargo workspace | **Owns** the loop (`run_turn`, `loop{}`) | Anthropic-native `ToolUse` + MCP bridge | **Loop-level**, modes + rules + Pre/Post hooks |
| [claux](harnesses/claux.md) | **Rust** · tokio · ratatui | **Owns** the loop (`Engine::submit`, `loop{}`) | Anthropic-native `tool_use`/`tool_result` + MCP | **Loop-level**, 4 modes (`default`/`accept-edits`/`bypass`/`plan`) |
| [Hermes Agent](harnesses/hermes.md) | **Python** · Ink TUI over JSON-RPC | **Owns** per-turn loop **+ meta-loop** between turns | OpenAI-style `tool_calls` | **Dangerous shell cmds only** (not uniform) |
| [llm-tui](harnesses/llm-tui.md) | **Rust** · ratatui · crossterm | **Owns** an event-driven poll loop | Provider-agnostic defs, text-roundtrip results | **Every call**, `y/n/a/q` keypress |

## Loop Architecture Matrix

| Aspect | Claude Code | OpenCode | pi | code_puppy |
|---|---|---|---|---|
| **Loop style** | async-generator streaming (`queryLoop`, `while(true)`) | two-layer Effect-TS step loop | dual nested `while` over an EventStream | delegated inner loop + REPL outer loop |
| **Who owns the turn loop** | the harness | harness (macro) + Vercel AI SDK (step) | the harness | pydantic-ai `Agent.run` |
| **Loop entrypoint** | `src/query.ts` | `prompt.ts:1252` | `agent-loop.ts:182` | `_runtime.py:349` (call site) |
| **Continuation signal** | no `tool_use` blocks → `end_turn` | last step has no pending tool calls | no pending tool calls / follow-ups | framework returns; outer loop drains steers |
| **Output** | streamed (yielded) | streamed via AI SDK | streamed via EventStream | streamed via `event_stream_handler` |
| **Interrupt handling** | abort signal → synthetic `tool_result`s | `ctx.blocked` → step returns `stop` | steering injections | steering injections between runs |

| Aspect | Claw Code | claux | Hermes Agent | llm-tui |
|---|---|---|---|---|
| **Loop style** | synchronous `run_turn` `loop{}` (capped by `max_iterations`) | async `submit_streaming` `loop{}` over `provider.stream` | per-turn `while < max_iterations` **+** between-turn skill/memory meta-loop | event-driven TUI poll loop (`check_response` per tick) |
| **Who owns the turn loop** | the harness | the harness | the harness (both loops) | the harness (render loop) |
| **Loop entrypoint** | `conversation.rs:318` | `query.rs:531` | `conversation_loop.py:351` | `main.rs:69` / `app.rs:515` |
| **Continuation signal** | assistant has no `ToolUse` → break | turn has no tool-uses → `Done`/break | no `tool_calls` → final response | `Done` event with no pending tools |
| **Output** | streamed (`AssistantEvent`) | streamed (`ApiEvent`→`StreamEvent`) | streamed (`stream_callback`) | streamed (`LlmEvent::Text` per tick) |
| **Interrupt handling** | `max_iterations` cap / hook abort signal | `CancellationToken` per tool | interrupt thread id; interrupt-and-redirect | `Esc` cancels the stream |

## Tool Handling & Permission Matrix

| Aspect | Claude Code | OpenCode | pi | code_puppy |
|---|---|---|---|---|
| **Tool registration** | typed `Tool` objects (`src/tools/`) | AI SDK `tool({execute})` from registry + MCP | own tool abstraction | `@agent.tool` Python functions |
| **Schema source** | hand-authored input schemas | AI SDK tool schemas | per-tool schema + `validateToolArguments` | generated from function signatures |
| **Dispatch** | `runTools(batch)` (`query.ts`) | SDK calls `execute` inline during stream | `executeToolCalls` (`agent-loop.ts:373`) | pydantic-ai matches by name, invokes with `RunContext` |
| **Concurrency** | batch per turn | inline during stream | **parallel by default**, order-preserving | framework-driven; prompts serialized by locks |
| **Where permission lives** | **one loop-level gate** | **inside each tool** (opt-in `ctx.ask`) | **nowhere interactive** | **inside each mutating tool** (callbacks) |
| **Real gate exists?** | ✅ `canUseTool` (`QueryEngine.ts`) | ✅ ruleset (`permission/index.ts:171`) | ⚠️ allow-lists + `beforeToolCall` hook only | ✅ `on_file_permission` / `get_user_approval` |
| **On denial** | error `tool_result` → model continues | `DeniedError` → error result; interactive reject breaks loop | hook `block:true` → error result | rejection result fed back to model |
| **Bypass** | permission modes (incl. `plan`) | rule `allow` / `experimental.continue_loop_on_deny` | default (no extension = no gate) | YOLO mode / non-interactive stdin |

| Aspect | Claw Code | claux | Hermes Agent | llm-tui |
|---|---|---|---|---|
| **Tool registration** | `ToolExecutor` (runtime/`tools` crates) | `ToolRegistry` of `Tool` trait objects (`tools/mod.rs`) | `tools/registry.py` (100+ tools) | fixed 6 defs (`provider/mod.rs:127`) |
| **Schema source** | hand-authored per tool | per-tool `input_schema()` | per-tool JSON schemas | hand-authored JSON schemas |
| **Dispatch** | sequential `for` over `pending_tool_uses` (`conversation.rs:411`) | `execute_tools_parallel` (read-only ∥, writes →) | `_execute_tool_calls` (concurrent/sequential) | `execute_tool` on confirm (`app.rs:789`) |
| **Concurrency** | sequential per turn | **parallel read-only**, sequential writes | concurrent for independent calls | one-at-a-time (queue + gate) |
| **Where permission lives** | **loop-level**, mode + rules + hooks | **loop-level**, 4-mode checker | **only dangerous shell commands** | **loop-level**, every call |
| **Real gate exists?** | ✅ `PermissionPolicy.authorize` (`permissions.rs:181`) | ✅ `PermissionChecker.check` (`permissions.rs:76`) | ⚠️ `detect_dangerous_command` (`approval.py:482`) — shell only | ✅ `handle_tool_confirmation` (`app.rs:1243`) |
| **On denial** | error `tool_result` → model continues | `Permission denied…` error result → continues | blocked result fed back → continues | "rejected by user" result fed back |
| **Bypass** | `allow` / `danger-full-access` mode, allowlists | `bypass` mode / session always-allow | frozen `HERMES_YOLO_MODE`, allowlists, aux-LLM auto-approve | sticky "All" (`a`) per session |

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

| Capability | Claw Code | claux | Hermes Agent | llm-tui |
|---|---|---|---|---|
| **Open source** | ✅ | ✅ | ✅ | ✅ |
| **Provider-agnostic** | ✅ (Anthropic/OpenAI/xAI) | ✅ (Anthropic/OpenAI/Ollama) | ✅ (many providers) | ✅ (5+ providers) |
| **Native MCP** | ✅ | ✅ | ✅ (+ OAuth) | ❌ |
| **Interactive approval** | ✅ | ✅ | ⚠️ (dangerous shell cmds only) | ✅ (every call) |
| **Parallel tool calls** | ❌ (sequential) | ✅ (read-only) | ✅ (independent calls) | ❌ (one-at-a-time) |
| **Rich TUI** | ⚠️ (REPL) | ✅ (ratatui) | ✅ (Ink/React) | ✅ (ratatui) |
| **Plugins / extensions** | ✅ (plugins, hooks) | ⚠️ (MCP + plugin surface) | ✅ (self-authored skills, MCP) | ❌ |
| **Owns its agent loop** | ✅ | ✅ | ✅ (+ meta-loop) | ✅ |

Legend: ✅ full / first-class · ⚠️ partial or indirect · ❌ absent.

## Architectural Axes

The eight harnesses separate cleanly along a few independent axes — which is what makes them worth comparing rather than ranking.

### 1. Who owns the loop?
From **fully owned** (Claude Code's hand-written async generator; pi's dual `while` loops; the three Rust ports — Claw Code, claux, llm-tui — each hand-writing their own `loop{}`/poll loop) through **hybrid** (OpenCode owns the macro step loop but hands each model-generation-plus-tool-execution to the Vercel AI SDK) to **fully delegated** (code_puppy hands the entire model→tool→result cycle to pydantic-ai's `Agent.run` and only orchestrates a REPL around it). Owning the loop buys control over retries, compaction, and permission placement; delegating buys provider-normalization and less code. The Rust newcomers cluster firmly in the "fully owned" camp — claux and Claw Code are essentially legible re-statements of the Claude-Code shape.

### 2. Where does permission live?
This is the sharpest divergence, and the new harnesses stretch it to both extremes. **llm-tui** is the maximal end — *every* tool call blocks on a `y/n/a/q` keypress with no rulesets at all, leaning on a hard `$HOME` sandbox for the rest. **claux** and **Claw Code** join Claude Code's **one-gate-in-the-loop** camp (claux with four modes; Claw Code with the most elaborate gate here — sandbox modes + per-tool rules + Pre/PostToolUse hooks + approval tokens). **Hermes** is the permissive extreme: there is *no* per-tool prompt — only *dangerous shell commands* route through an approval callback (file edits run ungated), with a frozen `HERMES_YOLO_MODE` and auxiliary-LLM auto-approval to cut fatigue. Against these, OpenCode and code_puppy's **in-tool** gates and pi's **no interactive gate** fill the middle. None is strictly better; they trade uniform safety against flexibility and headless ergonomics.

### 3. Whose tool-call protocol?

Claude Code, **Claw Code**, and **claux** speak **Anthropic-native** `tool_use`/`tool_result` directly. **Hermes** uses **OpenAI-style** `tool_calls`. **llm-tui** rolls its own provider-agnostic tool definitions and round-trips results as plain text. The remaining three delegate the wire protocol to a normalizing layer — the **Vercel AI SDK** (OpenCode), a **unified AI API** (pi), or **pydantic-ai** (code_puppy) — so they describe tools once and run on many models.

### 4. One loop, or two?

A new axis the latest cohort introduces. Every other harness has exactly one loop — the turn cycle. **Hermes** has two: the per-turn loop modeled here, *plus* a self-improving **skill/memory meta-loop** that runs on an hours-long idle-gated interval *between* turns (`curator.should_run_now`), autonomously creating and refining skills. That second loop is its headline feature but is structurally external to the coding turn — which is why it appears in the spec as a single trailing node rather than inside the four scenarios.

## Related

- [The Loops](loops.md) — the loops walked through, with links into the visualizer
- [Tool Handling](tool-handling.md) — dispatch and permission models in depth
- [User Interaction](user-interaction.md) — input, streaming, interrupts, sessions
- [Language & Runtime](language.md) — TypeScript, Python, and Rust harnesses across the set
- Per-harness profiles: [Claude Code](harnesses/claude-code.md) · [OpenCode](harnesses/opencode.md) · [pi](harnesses/pi.md) · [code_puppy](harnesses/code-puppy.md) · [Claw Code](harnesses/claw-code.md) · [claux](harnesses/claux.md) · [Hermes Agent](harnesses/hermes.md) · [llm-tui](harnesses/llm-tui.md)
