# Hermes Agent

**Type:** Self-improving agentic CLI + multi-platform gateway
**Repository:** https://github.com/NousResearch/hermes-agent
**Language:** Python (agent core) with an Ink/React TUI (`ui-tui/`) over a JSON-RPC gateway
**UI:** Full TUI (Ink) plus gateways for Telegram/Discord/Slack/WhatsApp/Signal/CLI
**Version analyzed:** revision `02d1da49`
**Loop spec:** [`hermes.json`](../../site/src/data/loops/hermes.json)

> Analyzed from the upstream tree at commit `02d1da49`. Line numbers are valid at that revision. The per-turn loop is `agent/conversation_loop.py`; tool dispatch is on the `AIAgent` class in `run_agent.py`; the dangerous-command gate is `tools/approval.py` + `tools/terminal_tool.py`; the meta-loop is `agent/curator.py` + `agent/background_review.py`.

## Core Approach

Hermes is the **structural contrast** in this comparison: it has *two* loops on *two* clocks. The **per-turn loop** is a conventional model→tools→model cycle (`conversation_loop.py:796`) that fits the shared vocabulary cleanly. The **meta-loop** — the thing the marketing leads with ("the only agent with a built-in learning loop") — runs *between* turns and *between sessions*: autonomous skill creation after complex tasks, skill self-improvement during use, agent-curated memory with periodic nudges, and cross-session recall. That second loop is real, but it is not part of the turn cycle, and pretending otherwise would misrepresent the architecture. The repo's job here is to show exactly where the per-turn loop ends and the meta-loop begins.

It is also by far the largest harness profiled — `conversation_loop.py` alone is ~4,700 lines, wrapping the model call in deep retry/recovery, prompt-caching, compression, and multi-provider transport logic.

## Loop Architecture

- **Entry:** `AIAgent.run_conversation` (`run_agent.py:4476`) delegates to the module-level `run_conversation` (`conversation_loop.py:351`), which builds the system prompt and may inject a memory/skill **nudge** on a turn-count interval (`:553`).
- **The loop:** `while (api_call_count < agent.max_iterations and agent.iteration_budget.remaining > 0)` (`conversation_loop.py:796`). Bounded by `max_iterations` *and* a token `iteration_budget`.
- **Model step:** `agent._interruptible_api_call(api_kwargs)` (`conversation_loop.py:1308`) runs one generation through the active transport adapter, wrapped in a retry loop (`:1157`) handling truncation, rate limits, billing, and stream errors.
- **Tool branch:** `if assistant_message.tool_calls:` (`conversation_loop.py:3608`). Tools present → dispatch and loop; no tools → the text is the answer, returned at `:4703`.
- **Exit reasons:** tracked in `_turn_exit_reason` (`:733`) — normal finish, `budget_exhausted`, `interrupted_by_user`, `guardrail_halt`, etc.

```
user msg (+nudge?) ──▶ turn loop ──▶ _interruptible_api_call ──▶ tool_calls?
       ▲                                                          │ no ──▶ done ──async──▶ curate (skills/memory)
       │ tool result / blocked result                            │ yes
   _execute_tool_calls (concurrent ∥ sequential) ◀───────────────┘
       │ dangerous shell cmd → approval ──deny──▶ blocked result
       └ safe op (file edits, most tools) ──▶ execute
```

## Tool-Call Protocol

The model emits OpenAI-style `tool_calls`; `agent._execute_tool_calls` (`run_agent.py:4376`) runs the whole batch — independent calls **concurrently** (`_execute_tool_calls_concurrent`, `run_agent.py:4450`), otherwise **sequentially** (`:4455`). The tool surface is enormous (100+ tools in `tools/registry.py`): file ops, terminal, browser (CDP + computer-use), web/X search, vision, TTS/transcription, MCP, delegation/subagents, cron, and a **skills** subsystem. Tools run inside a selectable **terminal backend** — local, Docker, SSH, Singularity, Modal, or Daytona — so "execute" can mean a serverless sandbox that hibernates when idle.

## Permission / Approval Model

A **targeted** gate, not a uniform one — and this is the honest finding. There is no per-tool allow/deny prompt on every call. Instead, `tools/approval.py` is "the single source of truth for the dangerous command system": `detect_dangerous_command` (`approval.py:482`) and hardline/sudo guards flag risky **shell commands**, which then route through `_check_all_guards` → an interactive or gateway `approval_callback` (`terminal_tool.py:261`/`:264`). Denied or blocked commands return a `pending_approval`/blocked result (`terminal_tool.py:1929`) that is fed back to the model rather than executed.

Notable hardening: `HERMES_YOLO_MODE` is **frozen at import** (`approval.py`) so a skill running in-process cannot set the env var to disable approvals mid-run — an explicit prompt-injection escalation defense. Per-session and permanent allowlists, plus an auxiliary-LLM "smart approval" for low-risk commands, reduce prompt fatigue. File edits are **not** gated by this system (they're governed by file-safety boundaries instead), which is why the `edit-file` scenario bypasses the approval node entirely.

## User Interaction

- **TUI** — an Ink/React terminal UI (`ui-tui/`) with multiline editing, slash-command autocomplete, history, **interrupt-and-redirect**, and streaming tool output, talking to the Python agent over a JSON-RPC gateway (`tui_gateway/`).
- **Gateways** — one process serves Telegram, Discord, Slack, WhatsApp, Signal, and CLI, with voice-memo transcription and cross-platform continuity.
- **Interrupts** — the agent stores its execution thread id at the start of `run_conversation` (`tools/interrupt.py`) so a user can interrupt mid-turn.

## Context & Memory

Context compression and conversation compaction are first-class (`agent/context_compressor.py`, `agent/conversation_compression.py`), with prompt-caching for cache-stable turns. Memory is agent-curated: a memory manager plus **periodic nudges** injected on a turn interval (`conversation_loop.py:519`) remind the agent to persist knowledge. **FTS5 session search** with LLM summarization gives cross-session recall, and Honcho provides dialectic user modeling.

## Extensibility

- **Providers** — many: Nous Portal, OpenRouter (200+ models), NVIDIA NIM, OpenAI, Gemini, Bedrock, Codex runtime, and custom endpoints, switchable with `hermes model`.
- **Skills** — an open-standard (`agentskills.io`) skill system the agent can **author and refine itself**; `optional-skills/` ships extras.
- **MCP** — full MCP client with OAuth (`tools/mcp_oauth*.py`), plus `optional-mcps/`.
- **Subagents & cron** — delegation tool spawns isolated subagents; a built-in cron scheduler runs unattended automations delivered to any platform.

## Limitations (as a comparison subject)

- The per-turn loop is buried in a **~4,700-line function** with dozens of provider/transport special cases; the clean model→tool→model spine is real but heavily ornamented.
- The **meta-loop cannot be represented in the four turn-scoped scenarios** without distortion — it runs on an hours-long idle-gated interval (`curator.should_run_now`, `curator.py:199`). It appears in the spec as a single trailing `curate` node, reachable from `done` by an explicit "async / between turns" edge.
- The approval gate is **narrow** (dangerous shell commands), so most tool calls — including file writes — are not interactively gated; comparing it to claux/llm-tui's per-write prompts requires this caveat.
- Marketing framing ("self-improving," "the only agent with a learning loop") describes the meta-loop, which is genuine but external to the coding turn — the per-turn behavior is a fairly standard tool-calling loop.

## Sources

- `agent/conversation_loop.py` (per-turn loop, model call, tool branch, nudges), `run_agent.py` (`AIAgent`, `_execute_tool_calls` concurrent/sequential), `tools/approval.py` (dangerous-command detection + session state + YOLO freeze), `tools/terminal_tool.py` (guard invocation + blocked result), `agent/curator.py` + `agent/background_review.py` (the self-improving meta-loop) — analyzed revision `02d1da49`

## Related

- [Comparison Matrices](../comparison.md)
- [The Loops](../loops.md)
- [Tool Handling](../tool-handling.md)
- [User Interaction](../user-interaction.md)
