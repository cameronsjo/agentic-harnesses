# User Interaction

How each harness takes input, streams output, handles interrupts, and lets a human steer mid-flight. This is the surface the developer actually touches — distinct from the loop that runs underneath it.

## Input & steering

All eight are conversational, but they differ in how a user injects guidance *while the agent is working*:

- **Claude Code** — slash commands (`src/commands/`), permission prompts, and a `plan` mode that restricts the agent to planning. Input is normalized through the engine (`QueryEngine.ts`).
- **OpenCode** — input drives the macro step loop; an event bus (`permission.asked` and friends) carries interactive prompts and replies between the agent and the UI.
- **pi** — an `EventStream` carries **steering injections**: the user can push messages that the inner loop drains between tool batches.
- **code_puppy** — a REPL outer loop (`_runtime.py:404`) drains **steering injections** and plugin retries between framework runs; mid-run guidance lands at the next loop turn.
- **Claw Code** — a `claw` REPL with slash commands (`/doctor`, `/session`), OAuth, and permission prompts via the `PermissionPrompter`; `claw-analog` offers a non-interactive NDJSON surface for CI.
- **claux** — REPL and `ratatui` TUI with slash commands (`/compact`, `/model`, `/resume`); the permission prompt (`y`/`n`/`a`, with diff) is the main mid-run interaction.
- **Hermes** — a full Ink TUI with **interrupt-and-redirect** plus gateways for Telegram/Discord/Slack/WhatsApp/Signal, so steering can arrive from a chat app while the agent works on a remote VM.
- **llm-tui** — a modal (vim) TUI; mid-run, the only interaction is the `y/n/a/q` tool prompt and `Esc` to cancel the stream.

The pattern is shared — *steer between steps, not mid-token* — but the harnesses range from "type into the same terminal" to Hermes's "message it from another platform entirely."

## Streaming output

Every harness streams, via a different mechanism:

| Harness | Streaming mechanism |
|---|---|
| Claude Code | the loop is an **async generator** — assistant text and tool activity are `yield`ed as they arrive |
| OpenCode | Vercel AI SDK `streamText` events, surfaced through the processor |
| pi | `EventStream` events |
| code_puppy | pydantic-ai's `event_stream_handler` (`event_stream_handler.py:95`) |
| Claw Code | `AssistantEvent` stream from `api_client.stream` |
| claux | `ApiEvent` → `StreamEvent` over an mpsc channel |
| Hermes | `_stream_callback` deltas through the gateway |
| llm-tui | `LlmEvent::Text` drained per render tick from a background thread |

## Interrupts

What happens when the user hits stop mid-tool is a good stress test of loop design:

- **Claude Code** — an abort controller is checked inside the executor; interrupting yields **synthetic `tool_result`s** so every `tool_use` keeps a matching result and the transcript stays valid for the next turn.
- **OpenCode** — an interactive reject sets `ctx.blocked` (`processor.ts:206`), the current step returns `"stop"`, and the macro loop breaks.
- **pi / code_puppy** — interruption is expressed as steering into the stream; the loop reaches a safe point between batches/runs rather than tearing down mid-execution.
- **claux** — every tool gets a `CancellationToken`, so long-running tools (e.g. Bash) can be cancelled mid-execution.
- **Hermes** — stores its execution thread id at the start of `run_conversation` (`tools/interrupt.py`) to support interrupt-and-redirect.
- **llm-tui** — `Esc` while streaming drops the receiver and saves whatever was buffered (`app.rs:1215`).

## Permission as interaction

For most of the set, the permission gate *is* a primary interaction point — the moment the agent pauses and asks. Claude Code, claux, and Claw Code prompt uniformly (claux/Claw Code mode-selected, with diffs); **llm-tui** prompts on *every* call; OpenCode prompts where a tool opts in (remembering once/always); code_puppy prompts per mutating tool. The outliers ask rarely: **Hermes** prompts only for dangerous shell commands, and **pi** generally **doesn't pause to ask** at all — its model is "configure up front, then let it run." See [tool handling](tool-handling.md#the-permission-gate--the-real-differentiator).

## UI surface

- **Claude Code** — rich React + Ink terminal UI (`src/components/`, `src/ink/`).
- **OpenCode** — client/server split; the agent core is detached from the front-end.
- **pi** — ships **TUI and web UI libraries** as part of the monorepo toolkit.
- **code_puppy** — CLI / REPL-centric.
- **Claw Code** — `claw` REPL; a narrow `claw-analog` shell for scripts/CI; a separate RAG web UI.
- **claux** — REPL plus a full-screen `ratatui` TUI (`--tui`) with markdown rendering.
- **Hermes** — Ink/React TUI over a JSON-RPC gateway, plus chat-platform front-ends (Telegram, Discord, Slack, …).
- **llm-tui** — modal `ratatui` TUI with vim keybindings, session tree, and provider/model screens.

## Related

- [The Loops](loops.md) · [Tool Handling](tool-handling.md) · [Comparison Matrices](comparison.md)
