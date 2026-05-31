# llm-tui

**Type:** Minimal multi-provider chat TUI with opt-in tool execution
**Repository:** https://github.com/ducks/llm-tui
**Language:** Rust (`ratatui` + `crossterm`)
**UI:** Modal (vim-style) terminal UI — session list, chat, providers, models
**Version analyzed:** revision `384a880b`
**Loop spec:** [`llm-tui.json`](../../site/src/data/loops/llm-tui.json)

> Analyzed from the upstream tree at commit `384a880b`. Line numbers are valid at that revision. The whole harness is ~6 source files; the loop lives entirely in `src/app.rs` driven by the render loop in `src/main.rs`.

## Core Approach

llm-tui is the **maximal-approval, zero-autonomy** end of the comparison. It is first a *chat* TUI — vim modes, session tree, provider/model management — that happens to expose six coding tools. There is no dedicated agent loop: the **`ratatui` render loop** (`main.rs:69`) is the driver, and each tick polls a background streaming thread for the model's output. Every single tool call stops the world and waits for a `y/n/a/q` keystroke before anything touches the disk. Where OpenCode and claux let a model run a burst of tools per turn, llm-tui makes the human the scheduler.

## Loop Architecture

- **Entry:** the event loop in `main.rs:69`. Each iteration redraws if needed, calls `check_autosave`, **`check_response`** (`app.rs:81`), `check_pull_progress`, then polls keyboard events for 100 ms.
- **Model call:** `send_llm_message` (`app.rs:934`) builds the system prompt + filtered history, attaches the six tool definitions (`provider/mod.rs:127`), and calls `provider.chat(...)` (`app.rs:1060`), which spawns a thread returning a `Receiver<LlmEvent>`. The loop does **not** block on it.
- **The real loop:** `check_response` (`app.rs:515`) `try_recv`s one `LlmEvent` per tick — `Text` (append to buffer), `ToolUse` (queue), `Done` (branch), `Error` (abort).
- **Continue vs. stop:** a `Done` event with pending tool results triggers `continue_with_tool_results` (`app.rs:1083`) — another model generation; a `Done` with nothing pending saves the final message and clears `waiting_for_response` (`app.rs:633`).

```
user msg ──▶ provider.chat (bg thread) ──▶ check_response (poll each tick)
                                               │  Text → buffer
                                               │  ToolUse → queue ──▶ [Y]es [N]o [A]ll [Q]uit
                                               │                         │ y/a → execute (home-sandboxed) ─┐
                                               │                         │ n   → "rejected by user" ───────┤
                                               │                         │ q   → cancel whole queue ──▶ done│
                                               │  Done + results → continue_with_tool_results ──▶ chat ◀────┘
                                               ▼  Done, no tools
                                            save final response ──▶ idle
```

## Tool-Call Protocol

Six tools, defined once in a provider-agnostic shape (`provider/mod.rs:127`) and dispatched by name in `execute_tool` (`app.rs:789`): **read, write, edit, glob, grep, bash**. They are deliberately Claude-Code-flavored (read returns `cat -n` line numbers; edit is an exact-match `old_string`/`new_string` replace that refuses ambiguous matches, `tools.rs:286`). The model emits `ToolUse` events; multiple calls in one turn queue in a `VecDeque` (`pending_tool_calls`) and are confirmed and executed **one at a time**. Results are collected in `pending_tool_results` and fed back to the model as an appended user message (`provider/mod.rs:101`) — there is no native tool-result role plumbing; it is text round-tripped.

## Permission / Approval Model

A real, **mandatory, per-call** gate — the strongest in this comparison. When a `ToolUse` arrives and `auto_approve_tools` is unset, `awaiting_tool_confirmation` flips and `handle_input` routes *every* keystroke to `handle_tool_confirmation` (`app.rs:1243`):

- **`y`/`Y`** → `confirm_tool_execution` runs the one tool (`app.rs:656`).
- **`n`/`N`** → `reject_tool_execution` records `"Tool execution rejected by user"` as the result and advances the queue (`app.rs:703`); the refusal is fed back to the model, so the loop continues.
- **`a`/`A`** → `approve_all_tools` runs the rest of the queue and sets the **sticky** `auto_approve_tools` flag for the remainder of the session (`app.rs:679`).
- **`q`/`Q`/`Esc`** → cancels the current call *and* the entire remaining queue (`app.rs:1257`), ending the turn.

There are **no rulesets, no per-tool policies, no allow/deny config** — just the live keystroke and the one sticky "All" escape hatch. Defense-in-depth is structural instead: every filesystem tool canonicalizes its path and refuses anything outside `$HOME` (`tools.rs:136`, `:220`, `:262`), and `bash` refuses to run unless the cwd is under `$HOME` (`tools.rs:615`).

## User Interaction

- **Streaming** — `Text` events accumulate in `assistant_buffer` and render live each tick.
- **Approval prompts** — surfaced as a `tool_status` line (`Waiting for confirmation: <tool> [Y]es [N]o [A]ll [Q]uit`); answered with a single keypress.
- **Interrupts** — `Esc` while waiting cancels the stream and saves whatever was buffered (`app.rs:1215`).
- **Modal editing** — Normal/Insert/Command vim modes via a `VimNavigator`; messages send on Enter (`app.rs:1342`).

## Context & Memory

Sessions persist in **SQLite** (`db.rs`); files read during a session are cached and restored on reopen (`app.rs:1513`). Token usage is tracked per message (a `len/4` estimate, `session.rs:31`), and **automatic compaction** triggers when usage crosses a configured fraction of the context window (`should_autocompact`, `session.rs:109`) — `compact_conversation` (`app.rs:819`) summarizes older non-tool messages via a synchronous model call and marks them collapsed.

## Extensibility

- **Providers** — a `LlmProvider` trait (`provider/mod.rs:83`) with implementations for Ollama, Anthropic, OpenAI, Gemini, Bedrock, and any OpenAI-compatible endpoint; chosen at runtime in dedicated Providers/Models screens.
- **Tools** — fixed at six, hard-coded; no plugin or MCP surface.
- **No agents/subtasks** — single conversation, no task delegation.

## Limitations (as a comparison subject)

- The "loop" is **emergent from a UI render loop**, not a self-contained agent loop — there is no single function you can point at and say "this is the turn." The closest thing is the `check_response` poller.
- Tool results are **stringified into a user message**, not carried as structured `tool_result` blocks, so the model's view of tool output is lossy compared to OpenCode/Claude Code.
- The approval model has **no granularity** — it is all-or-nothing per call (or the sticky "All"); you cannot pre-allow "edit" while gating "bash."
- Scope is **home-directory sandboxed by construction**; it is not trying to be a general autonomous coding agent, which is precisely why it is a useful low-autonomy baseline.

## Sources

- `src/main.rs` (render/event loop), `src/app.rs` (send/poll/approve/execute/continue — the entire loop), `src/tools.rs` (six tools + home sandbox), `src/provider/mod.rs` (provider trait, tool definitions, tool-result round-trip), `src/session.rs` (compaction) — analyzed revision `384a880b`

## Related

- [Comparison Matrices](../comparison.md)
- [The Loops](../loops.md)
- [Tool Handling](../tool-handling.md)
- [User Interaction](../user-interaction.md)
