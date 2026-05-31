# The Loops

The agent loop is the engine of a coding harness: the cycle that calls the model, runs whatever tools it asks for, feeds the results back, and repeats until the turn is done. Each loop below is reconstructed into a [loop spec](../site/src/data/loops/) and animated in the [visualizer](../site/) — open it and play the `edit-file` and `denied-tool` scenarios across all eight side-by-side.

> Every `file:line` below is valid at the pinned revision in [methodology](methodology.md).

## Claude Code — owned async-generator loop

`query()` → `queryLoop()` is a `while (true)` (`src/query.ts`) that streams one assistant turn (`callModel`, `src/query.ts`), accumulates `tool_use` blocks, and branches: tool calls → `runTools` → feed `tool_result`s back; none → `end_turn` (all in `src/query.ts`). The harness owns every part — retries spin up a fresh executor to avoid orphaned `tool_result`s, and an abort drains synthetic results.

```
user ─▶ stream model ─▶ tool_use? ─no─▶ end_turn
            ▲                │ yes
            └── tool_result ◀── runTools ◀── canUseTool
```

## OpenCode — owned macro loop over a borrowed step

`runLoop`'s `while (true)` (`prompt.ts:1252`) owns the *macro* iteration over conversation **steps**. Each step calls `handle.process()` (`prompt.ts:1444`), which runs one Vercel AI SDK `streamText` (`llm.ts:272`) — and because there's no `stopWhen`/`maxSteps`, that SDK call does one model generation plus inline tool execution. OpenCode folds the results into message state and re-prompts until an assistant turn finishes with no pending tool calls. Two layers, cleanly split: the harness owns "another step?", the SDK owns "generate and run tools."

## pi — two nested while loops over an EventStream

`runLoop` (`agent-loop.ts:182`) is an **inner** tool-call/steering loop wrapped by an **outer** follow-up loop, both iterating over an `EventStream`. `executeToolCalls` (`agent-loop.ts:373`) runs a batch **in parallel by default** (order-preserving), validating each call's args against its schema before `tool.execute()`. No interactive permission step interrupts the flow.

## code_puppy — delegated loop inside a REPL

code_puppy doesn't write an agent loop; it calls `await pydantic_agent.run(...)` (`_runtime.py:349`) and lets **pydantic-ai** run the model→tool→result cycle internally. code_puppy's own `while True` (`_runtime.py:404`) is an *outer* REPL/steering loop that only drains steering injections and plugin retries between framework runs. The Python harness's loop is mostly someone else's loop.

## Claw Code — owned synchronous turn loop with hooks

`ConversationRuntime::run_turn` is a `loop {}` (`conversation.rs:347`) capped by `max_iterations`. Each pass calls `api_client.stream` (`conversation.rs:361`), extracts `ToolUse` blocks (`:380`), and — if there are none — breaks with a `TurnSummary`. Pending tool-uses are processed **sequentially** (`:411`): every one runs a `PreToolUse` hook, then the `PermissionPolicy` (`permissions.rs:181`, five modes + per-tool rules), then the tool, then a `PostToolUse` hook. It is the most instrumented loop in the set — closest to a faithful re-statement of the Claude-Code shape, in Rust.

## claux — owned async turn loop, parallel reads

`Engine::submit_streaming`'s `loop {}` (`query.rs:549`) opens a `provider.stream`, drains `ApiEvent`s, and either finishes (no tool-uses) or runs the batch through a four-mode `PermissionChecker` (`permissions.rs:76`). In the non-streaming path, read-only auto-allowed tools run **in parallel** while writes go sequentially (`execute_tools_parallel`, `query.rs:425`). The loop self-heals — prompt-too-long compacts and retries, max-output-tokens doubles and retries.

## Hermes — per-turn loop plus a meta-loop

`run_conversation`'s `while api_call_count < max_iterations` (`conversation_loop.py:796`) is a conventional model→tool→model cycle: `_interruptible_api_call` (`:1308`), then `if assistant_message.tool_calls:` (`:3608`) dispatches the whole batch via `_execute_tool_calls` (concurrent for independent calls), else returns the final text. The twist is a **second loop on a different clock** — `curator`/`background_review` create and refine skills *between* turns and sessions. The per-turn loop is ordinary; the learning loop around it is the point.

## llm-tui — an event-driven poll loop

There is no blocking agent loop. The `ratatui` render loop (`main.rs:69`) ticks, and `check_response` (`app.rs:515`) drains one `LlmEvent` per tick from a background streaming thread: `Text` buffers, `ToolUse` queues behind a `y/n/a/q` gate, `Done` either feeds tool results back or ends the turn. The loop *is* the poller — and every single tool call stops it cold until a keypress.

## What the side-by-side reveals

Play the same scenario in the visualizer and the structural differences surface immediately:

- **`plain-answer`** — all eight collapse to roughly "input → model → done." The loops look most alike when no tools are involved.
- **`edit-file`** — Claude Code, claux, and Claw Code route through a single loop-level gate; llm-tui blocks on a keypress; OpenCode and code_puppy light up an approval node *inside* the tool; pi and **Hermes** sail straight from dispatch to execute with no prompt (Hermes gates only dangerous shell commands, so a file edit isn't gated).
- **`denied-tool`** — the honest divergence. Claude Code, pi, claux, and Claw Code turn a denial into an error result that loops back to the model; llm-tui's `n` does the same after a keypress; Hermes only reaches a gate here via a *dangerous shell command*; OpenCode's interactive *reject* can break the macro loop; code_puppy returns a rejection from inside the tool.
- **`multi-tool`** — pi, claux (read-only), and Hermes fan out in parallel; Claw Code and llm-tui sequence; the others batch.

## Related

- [Comparison Matrices](comparison.md) · [Tool Handling](tool-handling.md) · [User Interaction](user-interaction.md)
