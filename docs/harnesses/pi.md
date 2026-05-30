# pi

**Type:** CLI coding agent (terminal-native), part of a monorepo agent toolkit
**Repository:** https://github.com/earendil-works/pi
**Language:** TypeScript
**UI:** Custom TUI library (`@earendil-works/pi-tui`, differential rendering)
**Revision analyzed:** dbb9911a
**Loop spec:** [`pi.json`](../../site/src/data/loops/pi.json)

> pi is a monorepo toolkit — `packages/ai` (unified LLM API), `packages/agent` (the general-purpose agent core + loop), `packages/coding-agent` (the CLI with read/bash/edit/write tools and session management), and `packages/tui`. The agent loop lives in **`packages/agent`** (`src/agent-loop.ts`); the coding-agent CLI wires that loop to its tools, sessions, and extensions. Line numbers are valid at revision dbb9911a (see [methodology](../methodology.md)).

## Core Approach

pi separates the *loop* from the *harness*. `packages/agent` owns a provider-agnostic agent loop that streams an assistant turn, executes any tools the model requested, feeds results back, and repeats. `packages/coding-agent` supplies the model, the tool set, session persistence, and an extension system on top. The loop communicates through an `EventStream` of lifecycle events (`agent_start`, `turn_start`, `message_*`, `tool_execution_*`, `turn_end`, `agent_end`) rather than yielding text directly, which keeps the core decoupled from any particular UI.

## Loop Architecture

The loop is a **pair of nested `while` loops** in `runLoop` (`packages/agent/src/agent-loop.ts:155`):

- **Entry:** `runAgentLoop` (`agent-loop.ts:95`) seeds the prompt and calls `runLoop`. `Agent.prompt()` (`agent.ts:327` → `runPromptMessages` at `agent.ts:386`) is the stateful CLI-facing wrapper.
- **Outer loop** (`agent-loop.ts:170`): a `while (true)` that, when the agent would otherwise stop, polls `config.getFollowUpMessages` (`:257`) — queued messages that re-enter the loop — and `break`s only when none remain (`:265`).
- **Inner loop** (`agent-loop.ts:174`): runs while there are tool calls *or* pending steering messages. Steering messages drained from `getSteeringMessages` are injected before the next response (`:182`).
- **Model call:** `streamAssistantResponse` (`agent-loop.ts:193`, defined `:275`) converts `AgentMessage[]` → provider `Message[]` via `config.convertToLlm`, then calls `streamSimple` (`packages/ai/src/stream.ts:58`), accumulating a partial `AssistantMessage` from streamed `text`/`thinking`/`toolcall` deltas.
- **Branch:** the assistant message's content is filtered for `toolCall` blocks (`agent-loop.ts:203`); an `error`/`aborted` stop reason exits immediately (`:196`).
- **Tools:** `executeToolCalls` (`agent-loop.ts:373`) runs the batch in parallel by default (`executeToolCallsParallel`, `:451`) or sequentially when a tool declares `executionMode: "sequential"` or `config.toolExecution === "sequential"` (`:384`).

```
prompt/steer ─▶ stream model ─▶ toolCall blocks? ─no─▶ follow-ups? ─no─▶ agent_end
                    ▲                  │ yes                  │ yes
                    │                  ▼                      └──▶ re-enter inner loop
              tool_result ◀─ execute ◀─ validate + beforeToolCall ◀─ executeToolCalls(batch)
```

A `tool.execute()` call (`agent-loop.ts:636`) receives the abort signal and an `onPartial` callback that emits `tool_execution_update` events for live UI; its output becomes a `toolResult` message pushed back into context (`:212`).

## Tool-Call Protocol

Tools are `AgentTool` objects with a name, an input schema, and an `execute(id, args, signal, onPartial)` method. The model emits provider-native tool-call blocks, normalized into `toolCall` content on the assistant message; pi validates arguments against the tool schema with `validateToolArguments` (`packages/ai/src/utils/validation.ts:292`, called at `agent-loop.ts:580`) before execution and returns `toolResult` messages keyed by `toolCallId` (`createToolResultMessage`, `agent-loop.ts:727`). The coding-agent registers seven built-in tools — `read`, `bash`, `edit`, `write`, `grep`, `find`, `ls` (`packages/coding-agent/src/core/tools/index.ts:84`). A batch of tool calls in one assistant turn is handled together, with parallel-but-order-preserving results (`agent-loop.ts:502`).

## Permission / Approval Model

**pi has no interactive per-tool-call approval prompt.** Once the model requests a tool and its arguments validate, the tool runs. Control over what the model *can* do is exercised two ways:

1. **Coarse allow/deny lists, applied up front.** `allowedToolNames` / `disabledToolNames` (`agent-session.ts:171`–`173`) remove tools from the exposed set entirely, so the model never sees them. This is configuration, not a runtime gate.
2. **The `beforeToolCall` hook, as a programmatic block.** `prepareToolCall` calls `config.beforeToolCall` (`agent-loop.ts:581`); a returned `{ block: true, reason }` short-circuits into an *immediate error tool result* (`agent-loop.ts:598`) fed back to the model instead of executing. In the coding-agent this hook is wired only to the **extension runner** (`agent-session.ts:401`): an installed extension's `tool_call` handler can return `{ block }` (`extensions/runner.ts:819`). With no such extension, the hook does nothing and every validated call executes.

So a "denied tool" in pi is either a tool filtered out before the turn, or a call blocked by an extension/validation failure — there is no built-in human-in-the-loop confirmation step. The `denied-tool` scenario in the loop spec routes through the `prepare` node returning an error result, with no approval node.

## User Interaction

- **Event-driven streaming.** The loop pushes lifecycle events onto an `EventStream` (`agent-loop.ts:145`); the TUI subscribes via `Agent.subscribe` (`agent.ts:231`) and renders incrementally from `message_update` and `tool_execution_update` events.
- **Steering and follow-up queues.** While a turn is streaming, the user can queue messages: *steering* messages (`steer`, `agent.ts:264`) inject before the next response within the run; *follow-up* messages (`followUp`, `agent.ts:269`) run only after the agent would otherwise stop (`getFollowUpMessages`, `agent-loop.ts:257`). Each queue has a drain mode (`all` vs `one-at-a-time`, `agent.ts:134`).
- **Interrupts.** An `AbortController` per run (`agent.ts:300`); the signal is checked in prepare/execute paths so an abort yields error results rather than orphaned tool calls.
- **Slash commands, skills, prompt templates** are expanded in `AgentSession.prompt` (`agent-session.ts:991`–`1024`) before the message reaches the loop.

## Context & Memory

Sessions are persisted as JSONL (`packages/agent/src/harness/session/jsonl-storage.ts`); the coding-agent appends each `message_end` to the session manager (`agent-session.ts:503`). Context management includes compaction and branch summarization (`packages/coding-agent/src/core/compaction/`), with auto-compaction checks driven off the last assistant message (`agent-session.ts:470`). `convertToLlm` / `transformContext` hooks (`agent-loop.ts:284`–`289`) let the harness reshape the transcript at the LLM boundary each turn.

## Extensibility

- **Provider-agnostic by design.** `packages/ai` registers many providers — Anthropic, OpenAI (completions/responses/codex), Google, Vertex, Bedrock, Azure, Mistral, Cloudflare, GitHub Copilot — behind one `streamSimple` interface (`packages/ai/src/stream.ts:58`).
- **Extension system.** Extensions hook `input`, `tool_call`, `tool_result`, `resources_discover`, and UI events through the runner (`packages/coding-agent/src/core/extensions/runner.ts`); the `beforeToolCall`/`afterToolCall` agent hooks delegate to it (`agent-session.ts:401`, `:422`).
- **Reusable agent core.** Because the loop lives in `packages/agent` with injectable `streamFn`, `convertToLlm`, tools, and hooks, it can be embedded outside the CLI.

## Limitations (as a comparison subject)

- **No human-in-the-loop tool gate** out of the box — safety relies on tool-list configuration or an extension, unlike harnesses with a built-in approval prompt.
- The loop's two-level structure (steering inner loop, follow-up outer loop) is more moving parts than a single `while`, though each piece is small.
- Permission "denial" is modeled as a returned error result, not a first-class approval decision, so the comparison's `denied-tool` scenario maps onto the same `prepare` node rather than a dedicated approval node.

## Sources

- `packages/agent/src/agent-loop.ts`, `packages/agent/src/agent.ts` (the loop and its stateful wrapper)
- `packages/ai/src/stream.ts`, `packages/ai/src/utils/validation.ts` (LLM boundary, arg validation)
- `packages/coding-agent/src/core/agent-session.ts`, `packages/coding-agent/src/core/tools/index.ts`, `packages/coding-agent/src/core/extensions/runner.ts` (CLI wiring, tools, permission hooks)

## Related

- [Comparison Matrices](../comparison.md)
- [The Loops](../loops.md)
- [Tool Handling](../tool-handling.md)
