# Claude Code Events & Hooks

Claude Code exposes its loop as a series of **lifecycle events**, and lets you attach **hooks** that run at each one — to inject context, gate tool calls, observe, or block. This is the deepest extension surface of any harness in this comparison, and it's Claude-Code-specific (the others have their own models — see [tool handling](tool-handling.md)).

This doc is the reference; the [visualizer](../site/) overlays these events onto the [Claude Code loop](harnesses/claude-code.md) so you can see *where* each one fires. Every claim cites `file:line` at the [pinned revision](methodology.md).

## Where hooks fit

A hook is a program (or prompt, or HTTP call) Claude Code runs **at** a lifecycle event, passing it a JSON payload on stdin and reading a result from its exit code and stdout. The canonical list of events is the `HOOK_EVENTS` array (`src/entrypoints/sdk/coreTypes.ts:25`) — **27** of them.

```
SessionStart ─▶ [ UserPromptSubmit ─▶ model ─▶ PreToolUse ─▶ (permission) ─▶ tool ─▶ PostToolUse ─▶ … ─▶ Stop ] ─▶ SessionEnd
                                                    │ deny                                    │ fail
                                              PermissionDenied                        PostToolUseFailure
```

## The events

### Tool lifecycle
| Event | When | Key input | Can control | Blocking |
|---|---|---|---|---|
| **PreToolUse** | before a tool runs, **before** the permission check | `tool_name`, `tool_input`, `tool_use_id` | `permissionDecision` (allow/deny/ask), `updatedInput`, `additionalContext` | ✅ |
| **PostToolUse** | after a tool succeeds | + `tool_response` | `additionalContext`, `updatedMCPToolOutput` | ❌ |
| **PostToolUseFailure** | after a tool errors | + `error`, `is_interrupt` | `additionalContext` | ❌ |
| **PermissionRequest** | during the permission prompt | `tool_name`, `tool_input` | `decision.behavior`, `decision.updatedInput`, `decision.updatedPermissions` | ✅ |
| **PermissionDenied** | after a denial | + `reason` | `retry` | ❌ |

`PreToolUse` is the interesting one: it fires **before** `canUseTool` (the loop's permission gate — see [the loop](harnesses/claude-code.md#permission--approval-model)), and its `permissionDecision` can pre-empt the gate entirely. Dispatch is `runPreToolUseHooks` (`src/services/tools/toolHooks.ts:435`); the behavior is resolved at `:510`.

### Session lifecycle
| Event | When | Key input | Can control | Blocking |
|---|---|---|---|---|
| **SessionStart** | session begins | `source` (startup/resume/clear/compact), `model` | `additionalContext`, `initialUserMessage`, `watchPaths` | ✅ |
| **SessionEnd** | session exits | `reason` | `additionalContext` | ❌ |
| **Setup** | init / maintenance | `trigger` | `additionalContext` | ✅ |
| **SubagentStart** | subagent begins | `agent_id`, `agent_type` | `additionalContext` | ✅ |

`SessionStart` is fire-and-forget but powerful: it can inject context, seed an initial user message, and register file watchers via `watchPaths`. Default `SessionEnd` timeout is 1.5s (`CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS`).

### Turn / stop
| Event | When | Key input | Can control | Blocking |
|---|---|---|---|---|
| **Stop** | the turn / REPL is about to end | `stop_hook_active`, `last_assistant_message` | `additionalContext`, `preventContinuation` | ✅ |
| **SubagentStop** | a subagent's turn ends | + `agent_id`, `agent_transcript_path` | (same as Stop) | ✅ |
| **StopFailure** | a Stop hook errored | `error`, `error_details` | — | ❌ |

`Stop` with `preventContinuation` is how a hook keeps the agent working ("not done yet — run the tests").

### Compaction
| Event | When | Key input | Can control | Blocking |
|---|---|---|---|---|
| **PreCompact** | before context compaction | `trigger` (manual/auto), `custom_instructions` | modified instructions, `additionalContext` | ❌ |
| **PostCompact** | after compaction | `compact_summary` | `additionalContext` | ❌ |

### Context, files, config
| Event | When | Key input | Controls |
|---|---|---|---|
| **InstructionsLoaded** | a CLAUDE.md / memory file is loaded | `file_path`, `memory_type`, `load_reason` | — (observe) |
| **CwdChanged** | working directory changed | `old_cwd`, `new_cwd` | `watchPaths` |
| **FileChanged** | a watched file changed | `file_path`, `event` (change/add/unlink) | `watchPaths` |
| **ConfigChange** | a config file changed | `source` | — |
| **WorktreeCreate / WorktreeRemove** | git worktree lifecycle | `worktreePath` | — |
| **Notification** | internal notification | `message`, `title`, `notification_type` | — |

### Agent teams & MCP
| Event | When | Controls | Blocking |
|---|---|---|---|
| **TeammateIdle** | a teammate goes idle | `additionalContext`, `preventContinuation` | ✅ |
| **TaskCreated / TaskCompleted** | task lifecycle | `additionalContext`, `preventContinuation` | ✅ |
| **Elicitation / ElicitationResult** | MCP elicitation request/result | `action` (accept/decline/cancel), `content` | ✅ |

## Hook types

A hook isn't only a shell command. The config schema (`src/schemas/hooks.ts`) defines four user-facing types plus two code-only ones:

| Type | What it is |
|---|---|
| `command` | a shell command (bash or PowerShell), JSON or plain-text stdout |
| `prompt` | an LLM evaluation with an `$ARGUMENTS` placeholder, on a small fast model |
| `agent` | an agentic verifier that returns a decision via a mini-REPL |
| `http` | a POST to a URL returning JSON; `allowedEnvVars` gates env interpolation |
| `callback` / `function` | code-only (SDK / session-scoped), not configurable from settings.json |

## Configuration

Hooks live in `settings.json` under `hooks`, keyed by event, each an array of matcher→hooks groups:

```jsonc
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit|Bash",   // exact, pipe-OR, or regex; omit/`*` = all
        "hooks": [
          { "type": "command", "command": "./guard.sh", "timeout": 30,
            "if": "Bash(git *)",          // permission-rule-syntax pre-filter
            "async": false, "once": false }
        ]
      }
    ]
  }
}
```

- **`matcher`** is matched against the tool name: a bare identifier (exact), `A|B|C` (OR), or a regex.
- **`if`** is a finer pre-filter in permission-rule syntax (`Tool(pattern)`, e.g. `Write(*.md)`) — evaluated before the hook is even spawned.
- **`async` / `asyncRewake`**: run in the background; with `asyncRewake`, an exit-code-2 wakes the model via a notification.
- **`once`**: run once, then remove itself.

## Control-flow contract

How a hook talks back, via **exit code** and **stdout JSON**:

### Exit codes
| Code | Meaning |
|---|---|
| `0` | success — continue |
| `2` | **blocking error** — blocks the action (tool call, task, idle, exit); message shown to the user |
| other | non-blocking error — logged, execution continues |

### JSON stdout
Top-level (all optional): `continue` (false stops the model), `decision` (`approve`/`block`), `reason`, `systemMessage`, `suppressOutput`. The interesting control lives in `hookSpecificOutput`, a discriminated union keyed by `hookEventName`:

- **PreToolUse** → `permissionDecision` (`allow`/`deny`/`ask`), `permissionDecisionReason`, `updatedInput` (field-merge into tool input), `additionalContext`
- **PostToolUse** → `additionalContext`, `updatedMCPToolOutput`
- **SessionStart / Setup / SubagentStart** → `additionalContext`, and SessionStart `initialUserMessage` + `watchPaths`
- **PermissionRequest** → `decision.behavior`, `decision.updatedPermissions` (mutate runtime rules)

`additionalContext` is injected back as a system-reminder attachment the model sees. When several hooks answer the same event, **deny > ask > allow** — first deny wins.

## Where each event fires in the loop

This is the integration the [visualizer](../site/) draws — hooks overlaid on the [Claude Code loop](harnesses/claude-code.md):

| Loop node | Hook(s) that fire there |
|---|---|
| *(before the loop)* | `SessionStart`, `Setup`, `InstructionsLoaded` |
| `user-input` | `UserPromptSubmit` |
| `tool-dispatch` → `approval` | **`PreToolUse`** (before the gate) |
| `approval` | `PermissionRequest`; on deny → `PermissionDenied` |
| `execute` (after) | `PostToolUse`; on error → `PostToolUseFailure` |
| `done` | `Stop` (`SubagentStop` for subagents) |
| *(after the loop)* | `SessionEnd` |
| *(context management)* | `PreCompact` / `PostCompact` |

## Notable

- **Parallel execution.** All hooks for an event run concurrently (async generators), each with its own timeout; outcomes aggregate with deny > ask > allow precedence (`src/utils/hooks.ts`).
- **Default timeout** is 10 minutes (`TOOL_HOOK_EXECUTION_TIMEOUT_MS`); per-hook `timeout` (seconds) overrides.
- **Trust gate.** In interactive mode, user-defined hooks require workspace trust before running; managed (policy/plugin/built-in) hooks bypass.
- **Env vars** passed to hooks include `CLAUDE_PROJECT_DIR`, `CLAUDE_PLUGIN_ROOT`, and (for SessionStart/Setup/CwdChanged/FileChanged) `CLAUDE_ENV_FILE`.
- **Output parsing** tries JSON first (stdout starting with `{`), else treats it as plain text; HTTP hooks must return JSON.

## Sources

- `src/entrypoints/sdk/coreTypes.ts` (HOOK_EVENTS), `src/types/hooks.ts` (output schema), `src/schemas/hooks.ts` (config schema)
- `src/utils/hooks.ts` (dispatch, timeouts, trust, precedence), `src/services/tools/toolHooks.ts` (Pre/PostToolUse), `src/utils/claudemd.ts` (InstructionsLoaded)

## Related

- [Claude Code profile](harnesses/claude-code.md) · [What Goes Across the Wire](wire.md) · [The Loops](loops.md)
