# Claude Code

**Type:** CLI coding agent (terminal-native)
**Repository:** https://github.com/ponponon/claude_code_src (source-map recovery of `@anthropic-ai/claude-code`)
**Language:** TypeScript
**UI:** React + Ink (terminal)
**Version analyzed:** 2.1.88
**Loop spec:** [`claude-code.json`](../../site/src/data/loops/claude-code.json)

> **Source caveat — leak + speculation.** Studied from a **leaked / recovered** snapshot of `@anthropic-ai/claude-code` (a published source map allowed recovery), which is already somewhat old. Symbol names and structure are best-effort reconstruction, not guaranteed to match Anthropic's tree or current Claude Code. References are **file-level only** (no line numbers); read the internals below as indicative, not authoritative. See [methodology](../methodology.md).

## Core Approach

Claude Code is Anthropic's first-party CLI agent. Its agent loop is an **async generator** — `query()` delegates to `queryLoop()`, a `while (true)` that streams one assistant turn at a time, runs any tools the model asked for, feeds the results back, and repeats until the model ends a turn with no pending tool calls. Output is *yielded* as it streams, which is what gives the terminal UI its live, incremental feel.

## Loop Architecture

- **Entry:** `query()` (`src/query.ts`) yields from `queryLoop()` (`src/query.ts`).
- **The loop:** a `while (true)` in `src/query.ts`.
- **Model call:** `callModel` is consumed with `for await` (`src/query.ts`); `tool_use` blocks are accumulated as they stream. The code explicitly notes that `stop_reason === 'tool_use'` is *unreliable* and instead tracks tool-use by inspecting streamed blocks (`src/query.ts`).
- **Branch:** after the stream, the loop checks whether any `tool_use` blocks were emitted (`src/query.ts`). None → the turn terminates.
- **Tools:** `runTools(toolUseBlocks, …)` (`src/query.ts`) drives the whole batch; updates are consumed with `for await` (`src/query.ts`).
- **Resilience:** retries use a *fresh executor* to avoid orphaned `tool_result`s with stale `tool_use_id`s; an aborted run drains synthetic results so every `tool_use` keeps a matching `tool_result`; `max_tokens` triggers an escalation/recovery path (all in `src/query.ts`).

```
user msg ──▶ stream model ──▶ tool_use blocks? ──no──▶ end_turn
                  ▲                   │ yes
                  │                   ▼
            tool_result ◀── execute ◀── canUseTool gate ◀── runTools(batch)
```

## Tool-Call Protocol

Native **Anthropic `tool_use` / `tool_result`** content blocks. Tools are typed objects (see `src/Tool.ts`, `src/tools/`) with input schemas; the model emits `tool_use` blocks, the executor returns `tool_result` blocks keyed by `tool_use_id`. Multiple tool calls in a single assistant turn are handled as a batch.

## Permission / Approval Model

The distinguishing feature. A `canUseTool` function is threaded through the entire loop and **wrapped** in the engine (`src/QueryEngine.ts`) to record `permissionDenials`. Behavior depends on a **permission mode** carried in `appState.toolPermissionContext` (`src/QueryEngine.ts`) — including a `plan` mode (`src/QueryEngine.ts`) where the agent plans without executing. On a denial, an error `tool_result` is fed back to the model rather than crashing the turn, so the conversation continues with the tool's effect withheld.

## User Interaction

- **Streaming output** — the generator yields assistant text and tool activity as it arrives.
- **Interrupts** — an abort controller is checked inside the executor (`src/query.ts`); interrupting mid-tool yields synthetic results instead of leaving dangling tool calls.
- **Slash commands, plan mode, headless mode** — first-class (`src/commands/`, permission modes, headless latency checkpoints at `src/QueryEngine.ts`).
- **Rich TUI** — React + Ink components (`src/components/`, `src/ink/`).

## Context & Memory

Microcompaction keyed purely by `tool_use_id` (`src/query.ts`), reactive compaction retries (`src/query.ts`), and prompt-too-long handling (`src/query.ts`). Tasks/subagents run with their own context (`src/Task.ts`, `agentId` checks in the loop).

## Extensibility

Native **MCP** support, a plugin system (`src/plugins/`), hooks, skills (`src/skills/`), and output styles (`src/outputStyles/`).

## Limitations (as a comparison subject)

- Source is a **reconstruction**, not the upstream tree — fine for architectural study, not for exact reproduction.
- Single-vendor (Anthropic models) by design; not provider-agnostic like OpenCode or pi.
- The loop is large and defensive (retries, compaction, escalation), which is realistic but harder to read than the smaller harnesses.

## Sources

- `src/query.ts`, `src/QueryEngine.ts`, `src/Tool.ts`, `src/tools.ts`, `src/Task.ts` (analyzed revision)
- [Claude Code source recovery README](https://github.com/ponponon/claude_code_src)

## Related

- [Comparison Matrices](../comparison.md)
- [The Loops](../loops.md)
- [Tool Handling](../tool-handling.md)
