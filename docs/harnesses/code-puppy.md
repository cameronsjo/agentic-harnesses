# Code Puppy

**Type:** CLI coding agent (terminal-native REPL)
**Repository:** https://github.com/mpfaffenberger/code_puppy
**Language:** Python
**Framework:** [pydantic-ai](https://ai.pydantic.dev) (`pydantic-ai-slim[openai,anthropic,mcp]==1.56.0`)
**UI:** Rich + prompt_toolkit (terminal)
**Version analyzed:** `ccde401a`
**Loop spec:** [`code-puppy.json`](../../site/src/data/loops/code-puppy.json)

> Code Puppy is the Python outlier in this comparison. Unlike the TypeScript harnesses, which hand-roll their model-call/tool-dispatch loop, Code Puppy **delegates the inner loop to pydantic-ai's `Agent.run()`** and owns only the REPL, the prompt assembly, cancellation, retries, and the tool/approval surface around it. Line numbers are valid at revision `ccde401a` (see [methodology](../methodology.md)).

## Core Approach

Code Puppy is a multi-model code-generation agent. Its defining structural choice is that **it does not implement an agent loop of its own** in the usual sense. The "call the model → run the tools it asked for → feed the results back → repeat" cycle lives entirely inside pydantic-ai's `Agent.run()`. Code Puppy's own code is a wrapper that builds the pydantic-ai `Agent`, registers Python functions as tools, prepares the prompt, installs cancellation handlers, and drives a small *outer* loop for steering and hook retries between framework runs.

This is the cleanest demonstration in the set of "the framework is the loop." The harness's job is everything *around* the loop, not the loop body.

## Loop Architecture

- **REPL entry:** the interactive `while True` (`code_puppy/cli_runner.py:584`) reads a task with prompt_toolkit (`cli_runner.py:601`) and dispatches it as an asyncio task to `agent.run_with_mcp(...)` (`cli_runner.py:1025`).
- **Harness orchestration:** `run_with_mcp` (`code_puppy/agents/_runtime.py:287`) sanitizes the prompt, fires `user_prompt_submit` hooks, builds the pydantic-ai agent on first use, prepends the system prompt on turn 1, and wraps the run in signal- and key-listener-based cancellation.
- **The actual loop (framework):** `pydantic_agent.run(prompt, message_history=..., usage_limits=..., event_stream_handler=...)` (`_runtime.py:349`). pydantic-ai internally calls the model, dispatches `@agent.tool` functions, appends tool-return parts to the history, and repeats until the model stops requesting tools. **This file:line is the harness's call *into* the framework — the loop body is pydantic-ai's, not Code Puppy's.**
- **Outer steer/retry loop:** after `Agent.run` returns, a harness-level `while True` (`_runtime.py:404`) drains queued "steer" injections and plugin-requested hook retries, issuing capped follow-up `Agent.run` calls before the turn ends.
- **Resilience:** transient streaming failures are retried by the `streaming_retry` decorator (`_runtime.py:164`); interrupted tool calls are pruned from history on entry and exit (`_runtime.py:446`, `:498`).

```
user task (REPL) ──▶ run_with_mcp ──▶ pydantic_agent.run()  ◀─┐  [pydantic-ai owns this loop]
                                            │                  │
                                   tool call│                  │ tool result
                                            ▼                  │
                                      @agent.tool ──▶ approval ─┘
                                            │ (deny → rejection result, also fed back)
                                            ▼
                            no tool call ──▶ render ──▶ steer/hook retry? ──no──▶ done
```

## Tool-Call Protocol

Tools are **plain Python functions** registered on the pydantic-ai `Agent` with the `@agent.tool` decorator. `register_tools_for_agent` (`code_puppy/tools/__init__.py:253`) walks a name→registration-function map (`TOOL_REGISTRY`, `tools/__init__.py:87`) and calls each `register_*` function, which decorates a function like `edit_file` (`tools/file_modifications.py:651`) or `agent_run_shell_command` (`tools/command_runner.py:1383`). Each tool takes a `pydantic_ai.RunContext` as its first parameter.

This is the key difference from the Anthropic-native harnesses: **Code Puppy never sees or parses `tool_use` / `tool_result` content blocks.** pydantic-ai derives each tool's JSON schema from the Python function signature, normalizes the provider's function-calling format (OpenAI, Anthropic, Gemini, Bedrock — all configured through `ModelFactory`), matches the model's structured call by name, validates the arguments into the typed parameters, invokes the function, and converts the return value back into a provider-appropriate tool result. The tool-call protocol is the framework's responsibility; the harness only supplies typed functions and reads their return values.

A two-pass build (`agents/_builder.py:385`) constructs the agent once with empty toolsets to introspect registered names, then rebuilds with MCP toolsets filtered to avoid name collisions (`filter_conflicting_mcp_tools`, `_builder.py:287`). The legacy `edit_file` tool is auto-expanded into `create_file` / `replace_in_file` / `delete_snippet` (`TOOL_EXPANSIONS`, `tools/__init__.py:164`).

## Permission / Approval Model

Approval in Code Puppy is **per-tool and in-band — there is no loop-level permission gate** like Claude Code's `canUseTool`. Each tool decides for itself whether to prompt:

- **File mutations** call the `on_file_permission` callback (`callbacks.py:345`) before acting — e.g. `write_to_file` (`tools/file_modifications.py:455`), `replace_in_file` (`:486`), `delete_snippet_from_file` (`:425`). The bundled `file_permission_handler` plugin handles that callback and routes to `get_user_approval` (`plugins/file_permission_handler/register_callbacks.py:239`), showing a Rich panel with a diff preview and an arrow-key Approve / Reject / Reject-with-feedback selector.
- **Shell commands** prompt directly via `get_user_approval_async` (`tools/command_runner.py:1168`).
- **YOLO mode** (`get_yolo_mode`, checked at `register_callbacks.py:222` and `command_runner.py:1138`) skips all prompts. Non-interactive stdin **fails closed** for file ops (`_deny_noninteractive_approval`, `tools/common.py:71`) and is skipped for shell when not a TTY.
- **Parallel approvals are serialized** by module-level locks in `tools/common.py` (`_APPROVAL_SYNC_LOCK`, `_APPROVAL_ASYNC_LOCK`) so several tool calls in one turn queue their prompts instead of colliding on stdin.

On denial, the tool **returns a rejection result rather than raising** — `_create_rejection_response` (`tools/file_modifications.py:463`), or a `USER REJECTED: <feedback>` `ShellCommandOutput` (`command_runner.py:1181`). pydantic-ai feeds that string back to the model as the ordinary tool result, so the turn continues with the effect withheld. The denied-tool path is therefore not a special loop branch; it is just a tool that returns "no."

## User Interaction

- **REPL** — the outer `while True` (`cli_runner.py:584`) reads each task with prompt_toolkit completion and history.
- **Streaming output** — when enabled, `event_stream_handler` (`agents/event_stream_handler.py:95`) consumes pydantic-ai `PartStart` / `PartDelta` / `PartEnd` events and renders text, thinking, and tool activity live; a `StreamingTextDetector` falls back to a one-shot render if nothing streamed (`_runtime.py:437`).
- **Cancellation** — a background key listener and a `SIGINT` handler (`_runtime.py:524`–`:568`) cancel the in-flight agent task; `is_awaiting_user_input()` guards interrupts so a mid-prompt Ctrl+C is handled by `input()` instead.
- **Steering** — the user can inject mid-run guidance; `now`-mode steers fire via a history processor before each model call, `queue`-mode steers are drained between `Agent.run` calls (`_runtime.py:404`).

## Context & Memory

Message history is a list on the agent (`base_agent.py:70`), passed into every `Agent.run` as `message_history` and updated from `result.all_messages()`. A compaction history processor (`make_history_processor`) and a steer history processor are installed on the pydantic-ai agent in order — compaction first so it can trim to fit context, then steer injection so the just-arrived steer is never compacted (`_builder.py:395`). Interrupted tool calls are pruned from history on entry and exit (`_history.prune_interrupted_tool_calls`). Project/global rules load from `AGENTS.md` / `AGENT.md` (`load_puppy_rules`, `_builder.py:42`).

## Extensibility

- **Multi-model:** `ModelFactory` resolves OpenAI, Anthropic, Gemini, Bedrock, and more from `models.json`, with fallback (`load_model_with_fallback`, `_builder.py:235`).
- **MCP:** native via pydantic-ai toolsets, per-agent bindings, and auto-start (`load_mcp_servers`, `_builder.py:85`).
- **Plugins & hooks:** a callback bus (`callbacks.py`) exposes `on_register_tools`, `on_file_permission`, `on_agent_run_*`, `on_wrap_pydantic_agent`, and more; bundled plugins include the file-permission handler, a Claude-Code-hooks bridge, and a DBOS durable-execution wrapper.
- **Sub-agents:** `invoke_agent` / `list_agents` tools spawn other agents; sub-agents skip approval prompts and run silently (`command_runner.py:1141`).
- **Universal Constructor:** dynamically wraps registry tools into pydantic-ai tools (`tools/__init__.py:314`).

## Limitations (as a comparison subject)

- **The interesting loop is in the dependency.** Because pydantic-ai owns the model-call/tool-dispatch cycle, the most-studied part of an agent loop is not in this repo. The harness nodes representing the loop point at the *call site* (`_runtime.py:349`), not the framework internals.
- **No central permission gate.** Approval is scattered across individual tools, so coverage depends on each tool remembering to call `on_file_permission`. Read-only tools (read_file, grep, list_files) never prompt.
- **Heavy surface area.** The repo is large (browser automation, MCP management, many plugins), which can obscure the relatively thin loop wrapper.

## Sources

- `code_puppy/agents/_runtime.py`, `code_puppy/agents/_builder.py`, `code_puppy/agents/base_agent.py` (run orchestration, agent construction)
- `code_puppy/tools/__init__.py`, `code_puppy/tools/file_modifications.py`, `code_puppy/tools/command_runner.py`, `code_puppy/tools/common.py` (tool registration, dispatch, approval)
- `code_puppy/plugins/file_permission_handler/register_callbacks.py`, `code_puppy/callbacks.py` (permission callback)
- `code_puppy/cli_runner.py`, `code_puppy/agents/event_stream_handler.py` (REPL, streaming)
- `pyproject.toml` (pydantic-ai-slim 1.56.0 dependency)

## Related

- [Comparison Matrices](../comparison.md)
- [The Loops](../loops.md)
- [Tool Handling](../tool-handling.md)
