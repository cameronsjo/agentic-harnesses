# The Loops

The agent loop is the engine of a coding harness: the cycle that calls the model, runs whatever tools it asks for, feeds the results back, and repeats until the turn is done. Each loop below is reconstructed into a [loop spec](../site/src/data/loops/) and animated in the [visualizer](../site/) — open it and play the `edit-file` and `denied-tool` scenarios across all four side-by-side.

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

## What the side-by-side reveals

Play the same scenario in the visualizer and the structural differences surface immediately:

- **`plain-answer`** — all four collapse to roughly "input → model → done." The loops look most alike when no tools are involved.
- **`edit-file`** — Claude Code routes through its single `canUseTool` node; OpenCode and code_puppy light up an approval node *inside* the tool; pi sails straight from dispatch to execute with no gate.
- **`denied-tool`** — the honest divergence. Claude Code and pi turn a denial into an error result that loops back to the model; OpenCode's interactive *reject* can break the macro loop; code_puppy returns a rejection result from inside the tool.
- **`multi-tool`** — pi fans out in parallel; the others sequence or batch.

## Related

- [Comparison Matrices](comparison.md) · [Tool Handling](tool-handling.md) · [User Interaction](user-interaction.md)
