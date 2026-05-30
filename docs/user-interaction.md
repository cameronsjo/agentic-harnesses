# User Interaction

How each harness takes input, streams output, handles interrupts, and lets a human steer mid-flight. This is the surface the developer actually touches — distinct from the loop that runs underneath it.

## Input & steering

All four are conversational, but they differ in how a user injects guidance *while the agent is working*:

- **Claude Code** — slash commands (`src/commands/`), permission prompts, and a `plan` mode that restricts the agent to planning. Input is normalized through the engine (`QueryEngine.ts:560`).
- **OpenCode** — input drives the macro step loop; an event bus (`permission.asked` and friends) carries interactive prompts and replies between the agent and the UI.
- **pi** — an `EventStream` carries **steering injections**: the user can push messages that the inner loop drains between tool batches.
- **code_puppy** — a REPL outer loop (`_runtime.py:404`) drains **steering injections** and plugin retries between framework runs; mid-run guidance lands at the next loop turn.

The pattern is shared — *steer between steps, not mid-token* — but only pi and code_puppy name it explicitly as an injection stream.

## Streaming output

Every harness streams, via a different mechanism:

| Harness | Streaming mechanism |
|---|---|
| Claude Code | the loop is an **async generator** — assistant text and tool activity are `yield`ed as they arrive |
| OpenCode | Vercel AI SDK `streamText` events, surfaced through the processor |
| pi | `EventStream` events |
| code_puppy | pydantic-ai's `event_stream_handler` (`event_stream_handler.py:95`) |

## Interrupts

What happens when the user hits stop mid-tool is a good stress test of loop design:

- **Claude Code** — an abort controller is checked inside the executor; interrupting yields **synthetic `tool_result`s** so every `tool_use` keeps a matching result and the transcript stays valid for the next turn.
- **OpenCode** — an interactive reject sets `ctx.blocked` (`processor.ts:206`), the current step returns `"stop"`, and the macro loop breaks.
- **pi / code_puppy** — interruption is expressed as steering into the stream; the loop reaches a safe point between batches/runs rather than tearing down mid-execution.

## Permission as interaction

For three of the four, the permission gate *is* a primary interaction point — the moment the agent pauses and asks. Claude Code prompts uniformly; OpenCode prompts where a tool opts in (and remembers once/always); code_puppy prompts per mutating tool. pi is the outlier: it generally **doesn't pause to ask**, so its interaction model is "configure up front, then let it run." See [tool handling](tool-handling.md#the-permission-gate--the-real-differentiator).

## UI surface

- **Claude Code** — rich React + Ink terminal UI (`src/components/`, `src/ink/`).
- **OpenCode** — client/server split; the agent core is detached from the front-end.
- **pi** — ships **TUI and web UI libraries** as part of the monorepo toolkit.
- **code_puppy** — CLI / REPL-centric.

## Related

- [The Loops](loops.md) · [Tool Handling](tool-handling.md) · [Comparison Matrices](comparison.md)
