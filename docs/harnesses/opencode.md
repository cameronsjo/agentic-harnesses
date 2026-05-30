# OpenCode

**Type:** CLI/TUI coding agent (terminal-native, client/server)
**Repository:** https://github.com/anomalyco/opencode
**Language:** TypeScript (Bun monorepo, Effect-TS)
**UI:** Custom TUI (`packages/opencode/src/cli/cmd/tui/`)
**Version analyzed:** revision `b2a06351`
**Loop spec:** [`opencode.json`](../../site/src/data/loops/opencode.json)

> Analyzed from the upstream OpenCode tree at commit `b2a06351`. Line numbers are valid at that revision (see [methodology](../methodology.md)). The core lives in `packages/opencode/src/session/`.

## Core Approach

OpenCode separates two loops that are often fused in other harnesses. The **macro loop** is OpenCode's own `while (true)` over conversation *steps* (`prompt.ts:1252`); the **micro loop** — model generation plus tool execution for a single step — is delegated to the Vercel **AI SDK** (`streamText`). Each macro iteration runs one model step, lets the SDK dispatch any tool calls inline, folds the results into the message state, then re-prompts. The whole thing is written in Effect-TS, so the "loop" is an effectful generator pipeline rather than plain imperative code.

## Loop Architecture

- **Entry:** `prompt()` (`prompt.ts:1215`) creates the user message (`prompt.ts:1220`) and calls `loop()` → `runLoop()`.
- **The loop:** `while (true)` at `prompt.ts:1252`. Each iteration re-derives the message history and the last assistant's finish reason.
- **Exit condition:** if the last assistant turn finished *without* pending tool calls (and isn't an orphaned interrupted tool), the loop breaks (`prompt.ts:1290`). A `step` counter is capped at `agent.steps` (`maxSteps`, `prompt.ts:1339`).
- **Model step:** `handle.process(streamInput)` (`prompt.ts:1444`) runs one generation. Inside, `process()` pipes `llm.stream` through `handleEvent` and `runDrain` (`processor.ts:792`); the AI SDK `streamText` call (`llm.ts:272`) has **no `stopWhen`/`maxSteps`**, so it performs a single generation, executes tools, and stops — it does *not* auto-loop.
- **Step result:** `process()` returns `"compact"`, `"stop"`, or `"continue"` (`processor.ts:845`). `runLoop` branches on it (`prompt.ts:1476`): `stop` breaks, `compact` schedules compaction and continues, `continue` re-prompts.

```
user msg ──▶ runLoop step ──finished, no tools──▶ exit
                  │
                  ▼ needs step
            resolve tools ──▶ process()/streamText ──▶ drain LLMEvents
                  ▲                                         │ tool-call
                  │ continue / compact                      ▼
            process() result ◀── tool-result ◀── execute ◀── ctx.ask gate
                                                  (deny/reject ──▶ error tool-result)
```

## Tool-Call Protocol

Tools are **AI SDK `tool({ execute })` objects** assembled per step by `SessionTools.resolve` (`tools.ts:75`). The registry (`tool/registry.ts`) supplies the built-ins (edit, write, read, glob, grep, shell, task, todo, webfetch, etc.); MCP tools are merged in (`tools.ts:118`). The model emits `tool-call` parts, the SDK invokes each tool's `execute` (`tools.ts:93`), and the resulting `tool-result`/`tool-error` parts are normalized into `LLMEvent`s and captured by `completeToolCall`/`failToolCall` in the processor (`processor.ts:452`, `:504`). Multiple tool calls in one model step are executed within that single step before control returns to the macro loop.

## Permission / Approval Model

A real, **ruleset-based** gate — but invoked from *inside each tool*, not as a uniform pre-dispatch hook. A tool calls `ctx.ask(...)` (`tool/tool.ts:43`) when it wants approval: `edit.ts:98`, `write.ts:54`, `shell.ts:281`, and every MCP tool (`tools.ts:135`, unconditionally). That routes to `Permission.ask` (`permission/index.ts:171`), which evaluates the merged agent + session ruleset:

- **`deny`** → throws `DeniedError` (`permission/index.ts:180`); the tool's `execute` fails, the SDK emits `tool-error`, and the error becomes the tool result fed back to the model. The loop *continues*.
- **`allow`** → returns silently; the tool proceeds.
- **otherwise** → publishes a `permission.asked` event on the bus (`permission/index.ts:204`) and blocks on a `Deferred` until the UI replies `once`, `always`, or `reject` (`permission/index.ts:213`). `always` writes a new allow rule into the approved ruleset.

An interactive **reject** raises `RejectedError`, which sets `ctx.blocked` in the processor (`processor.ts:206`), so `process()` returns `"stop"` and the macro loop breaks — unless `experimental.continue_loop_on_deny` is set, which flips reject to behave like a continuing error (`processor.ts:783`). There is also a **doom-loop guard**: if the same tool+input repeats `DOOM_LOOP_THRESHOLD` times, a `doom_loop` permission is asked (`processor.ts:441`).

## User Interaction

- **Streaming** — `process()` drains an `LLMEvent` stream (`processor.ts:792`) and dual-writes message parts as they arrive, driving the TUI live.
- **Approval prompts** — surfaced via the `permission.asked` bus event; the user replies through an HTTP handler (`server/.../handlers/permission.ts:21`) that calls `Permission.reply`.
- **Interrupts** — abort is wired through `Effect.onInterrupt` in `process()` (`processor.ts:798`); interrupted tools are marked so the loop doesn't treat them as real tool calls (`prompt.ts:1268`).
- **Mid-loop user messages** — a user message arriving on a later step is wrapped in a `<system-reminder>` and re-injected (`prompt.ts:1415`).

## Context & Memory

Compaction is first-class and loop-driven: `process()` can return `"compact"`, and overflow detection (`compaction.isOverflow`, `prompt.ts:1325`) schedules automatic compaction. Compaction itself runs through the same processor (`compaction.ts:443`). Subtasks/agents are dispatched via the `task` tool and handled inline as a special task type in the loop (`prompt.ts:1305`).

## Extensibility

- **Providers** — provider-agnostic via the AI SDK; an opt-in **native runtime** (`OPENCODE_EXPERIMENTAL_NATIVE_LLM`) routes some models through `@opencode-ai/llm` directly, falling back to the AI SDK otherwise (`session/llm/AGENTS.md`).
- **MCP** — native client; MCP tools are merged into the per-step tool set (`tools.ts:118`).
- **Plugins** — `tool.execute.before`/`after` and `experimental.chat.messages.transform` hooks fire around dispatch (`tools.ts:88`, `prompt.ts:1433`).
- **Agents & skills** — agent definitions carry their own permission rulesets and `steps` cap; skills are exposed as tools (`tool/skill.ts`).

## Limitations (as a comparison subject)

- The loop is **split across two layers** — OpenCode's `runLoop` plus the AI SDK's internal `streamText` dispatch — so no single file shows the whole turn. The AI SDK side is a third-party dependency, not in this tree.
- Effect-TS makes control flow a pipeline of combinators (`Stream.tap`, `Effect.retry`, `Effect.onInterrupt`) rather than linear code; node boundaries are conceptual, not literal call sites.
- The permission gate is **opt-in per tool** (each `execute` decides whether to call `ctx.ask`), unlike a harness with a single mandatory pre-dispatch checkpoint. MCP tools always ask; built-ins ask selectively.

## Sources

- `packages/opencode/src/session/prompt.ts` (macro loop), `session/processor.ts` (step processing), `session/llm.ts` + `session/llm/AGENTS.md` (model call / runtime selection), `session/tools.ts` (tool resolution), `permission/index.ts` (permission gate), `tool/registry.ts`, `tool/edit.ts`, `tool/write.ts`, `tool/shell.ts` (analyzed revision `b2a06351`)

## Related

- [Comparison Matrices](../comparison.md)
- [The Loops](../loops.md)
- [Tool Handling](../tool-handling.md)
