# Tool Handling

How each harness turns a model's request to "run a tool" into an actual side effect — registration, dispatch, concurrency, and the all-important permission gate. See the [comparison matrix](comparison.md#tool-handling--permission-matrix) for the at-a-glance table; this doc explains the *shapes*.

## Registration: typed objects vs. decorated functions

- **Claude Code** — tools are typed `Tool` objects under `src/tools/` with hand-authored input schemas, speaking Anthropic-native `tool_use`/`tool_result`.
- **OpenCode** — tools are Vercel AI SDK `tool({ execute })` objects built per step by `SessionTools.resolve` (`tools.ts:75`) from a registry, with MCP tools merged in.
- **pi** — its own tool abstraction; args are validated against each tool's schema (`validateToolArguments`, `ai/src/utils/validation.ts:292`) before execution.
- **code_puppy** — plain Python functions decorated `@agent.tool`; **pydantic-ai generates the JSON schema from the function signature**. Registration is a name→function map, `TOOL_REGISTRY` (`tools/__init__.py:87`).

The split is philosophical: Claude Code describes tools *as data*; code_puppy describes them *as typed Python* and lets the framework derive the data.

## Dispatch & concurrency

| Harness | Dispatch site | Concurrency |
|---|---|---|
| Claude Code | `runTools(batch)` (`query.ts:1382`) | whole batch of `tool_use` blocks per turn |
| OpenCode | AI SDK calls `execute` inline (`tools.ts:93`) | inline during the stream |
| pi | `executeToolCalls` (`agent-loop.ts:373`) | **parallel by default**, order-preserving; sequential opt-in |
| code_puppy | pydantic-ai matches by name, invokes with `RunContext` | framework-driven; permission prompts serialized by module-level locks |

## The permission gate — the real differentiator

The single most interesting axis. Four harnesses, four placements:

**Claude Code — one gate in the loop.** `canUseTool` is threaded through the whole loop and wrapped (`QueryEngine.ts:252`) to record denials. *Every* tool passes through it; a `plan` permission mode lets the agent reason without executing. Uniform by construction.

**OpenCode — gate inside each tool, opt-in.** A genuine ruleset (`Permission.ask`, `permission/index.ts:171`) exists, but tools invoke it themselves via `ctx.ask` — `edit.ts`, `write.ts`, `shell.ts` ask selectively; every MCP tool asks unconditionally (`tools.ts:135`). A rule `deny` becomes an error result; an interactive **reject** sets `ctx.blocked` so the step stops and the loop breaks. Coverage is only as complete as the tools choose to make it.

**pi — no interactive gate.** Once the model requests a tool and its args validate, it runs. Control is (1) coarse `allowedToolNames`/`disabledToolNames` that strip tools from the exposed set, and (2) a programmatic `beforeToolCall` hook (`agent-loop.ts:581`) — wired only to the extension runner, so with no extension it's a no-op. pi trusts the model (or the embedding app) rather than prompting.

**code_puppy — in-band callbacks per mutating tool.** No loop-level gate. File-mutating tools call `on_file_permission` → `get_user_approval`; shell commands call `get_user_approval_async` directly (`command_runner.py:1168`). YOLO mode and non-interactive stdin short-circuit (file ops fail closed, shell skips). Denial returns a rejection result that pydantic-ai feeds back as an ordinary tool result.

### Why it matters

A **loop-level gate** (Claude Code) guarantees nothing executes unreviewed, at the cost of a gate the headless path must explicitly satisfy. **Per-tool gates** (OpenCode, code_puppy) localize the decision to where the side effect is, which is flexible but makes "is everything covered?" a per-tool question. **No gate** (pi) is the smoothest for autonomous/embedded use and the riskiest for ad-hoc interactive use. The right answer depends entirely on whether a human is watching.

## Related

- [The Loops](loops.md) · [Comparison Matrices](comparison.md) · [User Interaction](user-interaction.md)
