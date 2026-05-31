# claux

**Type:** Terminal AI coding assistant — Claude Code reimplementation in Rust
**Repository:** https://github.com/ducks/claux
**Language:** Rust (`tokio` async, `ratatui` TUI)
**UI:** REPL (line mode) and a full-screen `ratatui` TUI (`--tui`)
**Version analyzed:** revision `d906c568`
**Loop spec:** [`claux.json`](../../site/src/data/loops/claux.json)

> Analyzed from the upstream tree at commit `d906c568`. Line numbers are valid at that revision. The loop is the `Engine` in `src/query.rs`; the permission policy is `src/permissions.rs`; the TUI driver is `src/tui/chat.rs`.

## Core Approach

claux is the closest thing in this comparison to a faithful, from-scratch **Claude Code reimplementation** — same tool names (Read/Write/Edit/Glob/Grep/Bash/WebFetch/Agent/TodoWrite), same permission vocabulary (`default` / `accept-edits` / `bypass` / `plan`), same `y/n/a` prompt — but written in async Rust with a single, legible turn loop. Where OpenCode splits its loop across Effect-TS and the AI SDK, claux's loop is an ordinary `loop {}` you can read top to bottom (`query.rs:549`). It exists as a comparison subject precisely because it makes the canonical Claude-Code shape concrete and inspectable.

## Loop Architecture

- **Entry:** `Engine::submit_streaming` (`query.rs:531`) for the interactive path (REPL + TUI); a non-streaming `Engine::submit` (`query.rs:299`) mirrors it for scripted use.
- **The loop:** `loop {}` at `query.rs:549`. Each iteration assembles tool definitions, opens a model stream, drains it, and either finishes or executes tools and re-prompts.
- **Model step:** `provider.stream(...)` (`query.rs:551`) returns an `mpsc::Receiver<ApiEvent>`; the inner `while let Some(event) = rx.recv()` (`query.rs:584`) folds `Text` / `ToolUse` / `Usage` / `Done` into a buffer and a `tool_uses` list.
- **Exit condition:** if the turn produced no tool-use blocks, the loop emits `StreamEvent::Done` and breaks (`query.rs:650`).
- **Resilience:** the loop self-heals — a prompt-too-long error compacts and retries (up to 3×, `query.rs:606`); a max-output-tokens error doubles `max_tokens` up to 64k and retries (`query.rs:617`).

```
user msg ──▶ loop step ──▶ provider.stream ──▶ drain ApiEvents
                 ▲                                  │ no tool_use ──▶ Done (break)
                 │ re-prompt                        │ tool_use
            tool_results ◀── execute ◀── permission.check ──Ask──▶ UI y/a/n
                 ▲                            │ Deny (mode or user)
                 └──────── error result ◀─────┘
```

## Tool-Call Protocol

Nine built-in tools registered in a `ToolRegistry` (`tools/mod.rs:53`): Read, Write, Edit, Glob, Grep, Bash, WebFetch, **Agent** (spawns a scoped sub-conversation with a recursion-guarded registry, `tools/mod.rs:71`), and TodoWrite. MCP servers add more via `add_tools` (`tools/mod.rs:93`). Each tool implements a `Tool` trait exposing `name`, `input_schema`, `is_read_only`, `summarize`, and an async `execute` that takes a `CancellationToken` for interruptibility (`tools/mod.rs:43`). The model emits `ToolUse` blocks; results come back as `ContentBlock::ToolResult` blocks in a single `Message::tool_results` (`query.rs:759`), truncated to protect the context window.

A notable structural choice: in the non-streaming path, read-only auto-allowed tools are **partitioned out and executed in parallel** while write tools run sequentially (`execute_tools_parallel`, `query.rs:425`) — a small but real piece of scheduling the model doesn't have to think about.

## Permission / Approval Model

A clean, **mode-driven** gate — the heart of claux's Claude-Code fidelity. `PermissionChecker::check` (`permissions.rs:76`) returns `Allow`, `Deny(reason)`, or `Ask { message, diff }` according to one of four modes (`permissions.rs:8`):

- **Default** — auto-allow `Glob`; **ask** for `Read`/`Grep`/`WebFetch` and for all writes (`Bash`/`Write`/`Edit`). `Edit` asks come with a generated unified **diff** preview (`permissions.rs:176`).
- **AcceptEdits** — auto-allow `Write`/`Edit` and reads; still **ask** for `Bash`.
- **Bypass** — allow everything (including `rm -rf /` — there is a test asserting exactly that, `permissions.rs:212`).
- **Plan** — allow reads, **deny all writes** with `"Plan mode: write operations are disabled"`.

Session-level `always_allow` (the `a` response) and per-command `always_allow_command` (for Bash) override the mode for the rest of the session (`permissions.rs:61`). An `Ask` is surfaced to the UI: in streaming mode via a `oneshot` channel carrying an optional diff (`query.rs:675`); the TUI answers with **`y`/Enter → Allow, `a` → AlwaysAllow, `n`/Esc → Deny** (`chat.rs:501`). A denial — whether from a mode or a user keypress — becomes an error tool-result and the loop continues.

## User Interaction

- **Streaming** — `Text` events stream to the UI as they arrive; `ToolStart` and `ToolResult` events bracket each tool.
- **Approval prompts** — a dedicated `Mode::Permission` in the TUI shows the summary, optional diff, and the `y/n/a` choices (`chat.rs:488`).
- **Interrupts** — tools receive a `CancellationToken` so long-running work (e.g. Bash) can be cancelled mid-execution.
- **Slash commands** — `/compact`, `/model`, `/resume`, etc., parsed in `commands.rs`.

## Context & Memory

Sessions persist as **JSONL** (`db.rs`), resumable with `/resume`. Compaction is multi-strategy (`query.rs:210`): a cheap **snip** that collapses old messages first, escalating to an **API summarization** if snipping doesn't free enough. Auto-compact triggers when estimated tokens cross a configurable fraction (default 0.8) of the model's context window (`maybe_auto_compact`, `query.rs:179`). The system prompt is assembled from git status, `CLAUDE.md`, and environment info (`context.rs`). Cost is tracked per model in USD (`cost.rs`).

## Extensibility

- **Providers** — Anthropic, OpenAI, Ollama, or any OpenAI-compatible endpoint (`api/provider.rs`); OAuth via existing `claude login` credentials.
- **MCP** — external MCP tools merged into the registry (`tools/mcp.rs`, `tools/mod.rs:93`).
- **Sub-agents** — the `Agent` tool spawns scoped sub-conversations with a registry that omits `Agent` to prevent unbounded recursion (`tools/mod.rs:71`).
- **Plugins** — a `plugin.rs` surface exists for extension.

## Limitations (as a comparison subject)

- The streaming and non-streaming paths **duplicate the loop** (`submit` vs. `submit_streaming`), and the TUI's `chat.rs` reimplements the permission/execute step inline rather than calling the engine method — so "the loop" lives in three closely-parallel places.
- `Bypass` mode is genuinely unguarded (the test that `rm -rf /` is allowed is a feature statement, not a bug) — appropriate for a trusted-automation mode, but worth flagging next to llm-tui's always-gated stance.
- Read-only parallelism is only wired into the non-streaming `execute_tools_parallel`; the interactive streaming path runs tools in order.

## Sources

- `src/query.rs` (the `Engine` turn loop, streaming + non-streaming, parallel tool execution, compaction), `src/permissions.rs` (4-mode gate + always-allow), `src/tools/mod.rs` (registry, `Tool` trait, 9 built-ins), `src/tui/chat.rs` (TUI driver + `y/n/a` prompt), `src/api/provider.rs` (provider streaming) — analyzed revision `d906c568`

## Related

- [Comparison Matrices](../comparison.md)
- [The Loops](../loops.md)
- [Tool Handling](../tool-handling.md)
- [Permission models](../comparison.md)
