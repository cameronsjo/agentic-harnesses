# Tool Handling

How each harness turns a model's request to "run a tool" into an actual side effect — registration, dispatch, concurrency, and the all-important permission gate. See the [comparison matrix](comparison.md#tool-handling--permission-matrix) for the at-a-glance table; this doc explains the *shapes*.

## Registration: typed objects vs. decorated functions

- **Claude Code** — tools are typed `Tool` objects under `src/tools/` with hand-authored input schemas, speaking Anthropic-native `tool_use`/`tool_result`.
- **OpenCode** — tools are Vercel AI SDK `tool({ execute })` objects built per step by `SessionTools.resolve` (`tools.ts:75`) from a registry, with MCP tools merged in.
- **pi** — its own tool abstraction; args are validated against each tool's schema (`validateToolArguments`, `ai/src/utils/validation.ts:292`) before execution.
- **code_puppy** — plain Python functions decorated `@agent.tool`; **pydantic-ai generates the JSON schema from the function signature**. Registration is a name→function map, `TOOL_REGISTRY` (`tools/__init__.py:87`).
- **Claw Code** — a `ToolExecutor` over the `tools`/`runtime` crates with hand-authored schemas, speaking Anthropic-native `ToolUse` and bridging MCP tools (`mcp_tool_bridge.rs`).
- **claux** — a `ToolRegistry` of `Tool` trait objects (`tools/mod.rs:53`), nine built-ins (incl. `Agent` and `TodoWrite`) plus MCP via `add_tools`; each exposes `input_schema()` and an `is_read_only()` flag.
- **Hermes** — a large registry (`tools/registry.py`, 100+ tools) of OpenAI-style functions spanning files, terminal, browser, search, vision, and a self-authored **skills** subsystem.
- **llm-tui** — six fixed, hand-authored tool definitions in one provider-agnostic list (`provider/mod.rs:127`); results round-trip as plain text, not structured `tool_result` blocks.

The split is philosophical: Claude Code (and the Rust ports) describe tools *as data*; code_puppy and Hermes describe them *as typed functions* and let the framework/schema layer derive the data.

## Dispatch & concurrency

| Harness | Dispatch site | Concurrency |
|---|---|---|
| Claude Code | `runTools(batch)` (`query.ts`) | whole batch of `tool_use` blocks per turn |
| OpenCode | AI SDK calls `execute` inline (`tools.ts:93`) | inline during the stream |
| pi | `executeToolCalls` (`agent-loop.ts:373`) | **parallel by default**, order-preserving; sequential opt-in |
| code_puppy | pydantic-ai matches by name, invokes with `RunContext` | framework-driven; permission prompts serialized by module-level locks |
| Claw Code | sequential `for` over `pending_tool_uses` (`conversation.rs:411`) | one at a time per turn |
| claux | `execute_tools_parallel` (`query.rs:425`) | **read-only in parallel**, writes sequential |
| Hermes | `_execute_tool_calls` (`run_agent.py:4376`) | concurrent for independent calls, else sequential |
| llm-tui | `execute_tool` on confirm (`app.rs:789`) | one at a time (queue drained behind the gate) |

## The permission gate — the real differentiator

The single most interesting axis. Eight harnesses span the full range from "gate every call" to "no gate at all":

**Claude Code — one gate in the loop.** `canUseTool` is threaded through the whole loop and wrapped (`QueryEngine.ts`) to record denials. *Every* tool passes through it; a `plan` permission mode lets the agent reason without executing. Uniform by construction.

**OpenCode — gate inside each tool, opt-in.** A genuine ruleset (`Permission.ask`, `permission/index.ts:171`) exists, but tools invoke it themselves via `ctx.ask` — `edit.ts`, `write.ts`, `shell.ts` ask selectively; every MCP tool asks unconditionally (`tools.ts:135`). A rule `deny` becomes an error result; an interactive **reject** sets `ctx.blocked` so the step stops and the loop breaks. Coverage is only as complete as the tools choose to make it.

**pi — no interactive gate.** Once the model requests a tool and its args validate, it runs. Control is (1) coarse `allowedToolNames`/`disabledToolNames` that strip tools from the exposed set, and (2) a programmatic `beforeToolCall` hook (`agent-loop.ts:581`) — wired only to the extension runner, so with no extension it's a no-op. pi trusts the model (or the embedding app) rather than prompting.

**code_puppy — in-band callbacks per mutating tool.** No loop-level gate. File-mutating tools call `on_file_permission` → `get_user_approval`; shell commands call `get_user_approval_async` directly (`command_runner.py:1168`). YOLO mode and non-interactive stdin short-circuit (file ops fail closed, shell skips). Denial returns a rejection result that pydantic-ai feeds back as an ordinary tool result.

**claux — one gate in the loop, four modes.** `PermissionChecker.check` (`permissions.rs:76`) returns `Allow`/`Deny`/`Ask` under `default`/`accept-edits`/`bypass`/`plan`. An `Ask` surfaces to the TUI (`y`/`a`/`n`, with a generated diff for edits); session `always-allow` overrides. Uniform like Claude Code, but mode-selected and with parallel read-only execution.

**Claw Code — the most elaborate gate.** `PermissionPolicy.authorize_with_context` (`permissions.rs:181`) layers five modes (`read-only`/`workspace-write`/`danger-full-access`/`prompt`/`allow`), per-tool requirements, config rules, an interactive `PermissionPrompter`, **and** `PreToolUse`/`PostToolUse` hooks that can override the decision — plus a separate approval-token mechanism. Coverage is uniform *and* deeply configurable.

**Hermes — gate only the dangerous shell commands.** There is no per-tool prompt. `detect_dangerous_command` (`approval.py:482`) flags risky *shell* commands, which route through an interactive/gateway `approval_callback` (`terminal_tool.py:261`); file edits and most tools run ungated. `HERMES_YOLO_MODE` is frozen at import (a prompt-injection defense), and an auxiliary LLM can auto-approve low-risk commands. The narrowest interactive gate in the set.

**llm-tui — gate every single call.** The maximal-approval baseline. A `ToolUse` event flips `awaiting_tool_confirmation` and every keystroke routes to `handle_tool_confirmation` (`app.rs:1243`): `y`/`n`/`a`/`q`. No rulesets — just the live keypress (and a sticky "All"), backed by a hard `$HOME` sandbox in every tool.

### Why it matters

A **loop-level gate** (Claude Code, claux, Claw Code) guarantees nothing executes unreviewed, at the cost of a gate the headless path must explicitly satisfy — claux and Claw Code show how far that model can be configured (modes, rules, hooks). **Gate-every-call** (llm-tui) maximizes safety and minimizes autonomy — fine for a careful human, impossible for unattended runs. **Per-tool gates** (OpenCode, code_puppy) localize the decision to the side effect, which is flexible but makes "is everything covered?" a per-tool question. **Narrow gates** (Hermes — dangerous shell only) and **no gate** (pi) optimize for autonomous/embedded use and accept the corresponding risk. The right answer depends entirely on whether a human is watching.

## Related

- [The Loops](loops.md) · [Comparison Matrices](comparison.md) · [User Interaction](user-interaction.md)
