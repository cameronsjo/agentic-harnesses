# Claw Code

**Type:** Multi-provider agentic coding CLI (Claude-Code parity port)
**Repository:** https://github.com/ultraworkers/claw-code
**Language:** Rust (Cargo workspace under `rust/`)
**UI:** REPL (`claw`), plus a narrow scriptable shell (`claw-analog`) and a RAG service
**Version analyzed:** revision `4d3dc5b8`
**Loop spec:** [`claw-code.json`](../../site/src/data/loops/claw-code.json)

> Analyzed from the upstream tree at commit `4d3dc5b8`. Line numbers are valid at that revision. The loop is `ConversationRuntime::run_turn` in `rust/crates/runtime/src/conversation.rs`; the permission policy is `rust/crates/runtime/src/permissions.rs`; the CLI binary is the `rusty-claude-cli` crate.

## Core Approach

Claw Code presents itself as a clean-room **Rust port with parity** to a reference Claude-Code-style harness (there is a `PARITY.md` and a mock-Anthropic harness for behavioral comparison). The **open question on intake was whether it has a loop of its own or merely shells out to an external runtime** — it does not delegate: it owns a complete synchronous turn loop (`conversation.rs:347`), calls providers directly through its own `api` crate (Anthropic / OpenAI-compatible / xAI), and ships a genuine, multi-mode permission system. So it onboards as a full harness rather than joining the exclusion list.

It is worth reading skeptically against its marketing, though. The README itself is a useful corrective: features that *sound* shipped are gated honestly — e.g. `claw acp serve` "is currently a discoverability alias only, returns status with exit code 0," and real ACP/Zed support "remains tracked separately in ROADMAP.md." The value of reconstructing the loop from source is exactly this: the `run_turn` function is real and legible, whatever the surrounding claims.

## Loop Architecture

- **Entry:** `ConversationRuntime::run_turn` (`conversation.rs:318`). It records the turn, optionally runs a **session-health probe** if the session was compacted (`:326`), and pushes the user message (`:337`).
- **The loop:** `loop {}` at `conversation.rs:347`, with `iterations` capped by `max_iterations` (`:349`). Each pass builds an `ApiRequest` from the system prompt + full history.
- **Model step:** `api_client.stream(request)` (`conversation.rs:361`); the `AssistantEvent` stream is folded by `build_assistant_message` (`:368`) into content blocks, usage, and prompt-cache telemetry.
- **Exit condition:** the assistant message's `ToolUse` blocks are extracted as `pending_tool_uses` (`:380`); if there are none, the loop breaks (`:407`) and a `TurnSummary` is returned (`:513`).
- **Auto-compaction** is checked every iteration, including the terminal one (`:403`).

```
user msg ──▶ run_turn loop ──▶ api_client.stream ──▶ extract ToolUse
                 ▲                                       │ none ──▶ TurnSummary
                 │ re-prompt                             │ tool_use (per tool, sequential)
            push tool_result ◀── execute ◀── permission ◀── PreToolUse hook
                 ▲                  +PostToolUse    │ Deny / prompt reject
                 └──── error result ◀──── denied ◀──┘
```

## Tool-Call Protocol

The model emits `ToolUse` content blocks; `run_turn` iterates `pending_tool_uses` **sequentially** (`conversation.rs:411`), and a `ToolExecutor` runs each by name (`conversation.rs:462`). Tools live in the `tools` and `runtime` crates: bash (with a `bash_validation` classifier that tags commands read-only vs. write), file operations, glob/grep, plus **MCP-bridged** tools (`mcp_tool_bridge.rs`, `mcp_client.rs`) and a RAG `retrieve_context` when `RAG_BASE_URL` is set. Results — success or error — are pushed back as tool-result messages (`conversation.rs:505`) and the loop re-prompts.

A distinctive feature inherited from the reference design is the **hook system**: `PreToolUse` (`conversation.rs:412`), `PostToolUse`, and `PostToolUse` failure hooks (`:475`/`:469`) wrap every execution, and hooks can rewrite tool input, inject feedback, or override the permission decision.

## Permission / Approval Model

A real, **mode-based** policy in `permissions.rs`. `PermissionMode` (`permissions.rs:9`) is a superset blending Codex-style sandbox modes with Claude-Code-style prompting:

- **`read-only`**, **`workspace-write`**, **`danger-full-access`** — sandbox scopes,
- **`prompt`** — interactive approval,
- **`allow`** — auto-allow.

`authorize_with_context` (`permissions.rs:181`) resolves an outcome from the active mode, per-tool requirements (`with_tool_requirement`), and config rules (`with_permission_rules`). In `prompt` mode it consults an interactive `PermissionPrompter` (`permissions.rs:281`) whose `Allow`/`Deny` decision becomes the result; `allow`/`danger-full-access` auto-allow. A `PreToolUse` hook can override with `Allow`/`Deny`/`Ask` (`conversation.rs:416`) and takes precedence. The outcome is always `Allow` or `Deny { reason }` (`permissions.rs:92`); a denial — from the mode, a prompt rejection, or a hook — becomes an **error tool-result** fed back to the model, and the loop continues (`conversation.rs:498`). There is additionally an **approval-token** mechanism (`approval_tokens.rs`) and a separate **policy engine** / **permission enforcer** layer for richer rule evaluation.

So claw-code's gate is the most elaborate of the four new harnesses — modes *and* per-tool rules *and* hooks *and* an interactive prompter — closest in spirit to Claude Code's own permission stack.

## User Interaction

- **REPL** — `claw` is an interactive REPL with `/doctor`, `/session`, slash commands, OAuth, and streaming.
- **Approval prompts** — surfaced through the `PermissionPrompter` trait when the mode is `prompt`.
- **Scriptable shell** — `claw-analog` is a narrow, file-only variant over the same `api` crate with explicit permission presets (e.g. read-only `audit`) and NDJSON output, aimed at CI/external agents without bash.

## Context & Memory

Sessions persist and can be resumed (`--resume latest`) and forked (`fork_session`, `conversation.rs:555`). Auto-compaction triggers on an input-token threshold (`auto_compaction_threshold_from_env`, `conversation.rs:699`) and runs each iteration; a **session-health probe** guards against an inconsistent state after compaction (`conversation.rs:301`). A separate `claw-rag-service` indexes the repo into SQLite (chunks + embeddings) and serves semantic search the agent can pull via `retrieve_context`.

## Extensibility

- **Providers** — Anthropic, OpenAI-compatible, and xAI via the `api` crate; OAuth (`oauth.rs`) and local OpenAI-compatible endpoints.
- **MCP** — client, stdio transport, lifecycle hardening, and a tool bridge (`mcp_client.rs`, `mcp_stdio.rs`, `mcp_lifecycle_hardened.rs`, `mcp_tool_bridge.rs`).
- **Plugins & hooks** — a `plugins` crate with bundled examples and pre/post hook scripts; the runtime fires Pre/PostToolUse hooks around every tool.
- **Teams / lanes / cron** — `task_registry.rs`, `lane_events.rs`, `team_cron_registry.rs` hint at multi-agent/scheduling ambitions (parity/roadmap territory).

## Limitations (as a comparison subject)

- The repo carries heavy **parity/port scaffolding** (mock-Anthropic service, compat-harness, `g004`/`g011` conformance, `PARITY.md`) — useful signal that it's a reimplementation, but it means not every advertised surface is wired (e.g. ACP is a status-only alias today).
- The loop is **synchronous and single-threaded per turn** (tools run sequentially in a `for` loop), unlike claux's parallel read-only execution.
- The permission surface is **large** (five modes + rules + hooks + tokens + a policy engine), so "what will actually prompt" depends on mode *and* per-tool config — powerful, but harder to summarize than llm-tui's single gate or claux's four modes.
- A second Python/reference workspace under `src/` exists for audit helpers and is explicitly "not the primary runtime surface" — don't mistake it for the agent.

## Sources

- `rust/crates/runtime/src/conversation.rs` (the `run_turn` loop, model call, tool iteration, hooks), `rust/crates/runtime/src/permissions.rs` (PermissionMode, authorize_with_context, prompter), `rust/crates/runtime/src/{permission_enforcer,policy_engine,approval_tokens}.rs` (richer gate layers), `rust/crates/rusty-claude-cli` (the `claw` REPL binary), `rust/crates/api` (provider streaming) — analyzed revision `4d3dc5b8`

## Related

- [Comparison Matrices](../comparison.md)
- [The Loops](../loops.md)
- [Tool Handling](../tool-handling.md)
- [Methodology — pinned sources](../methodology.md)
