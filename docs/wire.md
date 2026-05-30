# What Goes Across the Wire

The [loop docs](loops.md) cover control flow *inside* a harness. This one covers what actually leaves it — the HTTP request to the model API and the response that comes back. Focused on **Claude Code** (the richest), with a four-way comparison table at the end.

> **Source caveat.** This deep dive is **based on the Claude Code leak + informed speculation** — a leaked/recovered, somewhat-old source snapshot. References are **file-level only** (paths relative to `claude-code-src/`); read the specifics as indicative of how the shipped CLI behaves, not as an authoritative or current account. See [methodology](methodology.md).

## The API client

Claude Code calls the model through the Anthropic SDK — `new Anthropic()` (`src/services/api/client.ts`) — but the same client targets **four providers**: the first-party API, AWS Bedrock, Azure Foundry, and Google Vertex, with auth (API key / OAuth / cloud credentials) selected per provider. Every request carries an attribution header with `cc_version`, `cc_entrypoint`, and `cc_workload` (`src/constants/system.ts`) so Anthropic can see it's Claude Code traffic.

## Anatomy of a request

A single `/v1/messages` call assembles four things. What's worth understanding is *which parts are stable* — because that's what prompt caching keys on.

```
┌─ system  ── modular sections (stable) … │ __DYNAMIC_BOUNDARY__ … (volatile) ┐
├─ tools   ── tool JSON schemas                                               │  ← cache breakpoints
├─ messages ─ CLAUDE.md (nested_memory) + conversation history                │     sit at the last
└─ (cache_control markers placed on the trailing stable blocks)              ┘     stable block
```

### System prompt — modular, cache-aware sections
The system prompt isn't one string; it's built from sections via a `systemPromptSection()` factory (`src/constants/prompts.ts`), each computed once and cached until `/clear` or `/compact` (`src/constants/systemPromptSections.ts`). Sections cover the base identity, tool guidelines, working directory, memory (CLAUDE.md), skills, and hooks info. The base line itself varies by entrypoint (`getCLISyspromptPrefix()`, `src/constants/system.ts`) — "You are Claude Code…" interactively, an Agent-SDK variant headless.

The key construct is a sentinel: `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` (`src/constants/prompts.ts`). Everything before it is stable and cacheable (and can even use a **global** cache scope shared across orgs); everything after is per-user/volatile. The boundary is *where* the static/dynamic split is drawn so the prefix can be cached aggressively.

### Tools
Tool JSON schemas are sent on every request and are stable across a session, which makes them a prime cache target — the **last tool schema block** is one of the two cache breakpoints.

### Context files — CLAUDE.md, hierarchically
`getMemoryFiles()` (`src/utils/claudemd.ts`) discovers memory files in priority order — managed global, user global (`~/.claude/CLAUDE.md`), project (`CLAUDE.md`, `.claude/CLAUDE.md`, `.claude/rules/*.md`), then local (`CLAUDE.local.md`) — loading lowest-priority first so the closest file wins. The `@include` directive (`@path`, `@./rel`, `@~/home`) expands files inline with circular-reference protection (`src/utils/claudemd.ts`), restricted to text extensions. Loaded files are injected as `nested_memory` attachments on user messages and cached to avoid re-injection; an `InstructionsLoaded` [hook](claude-code-events.md) fires for each.

## Prompt caching — the sophisticated part

Caching is where Claude Code does the most work. `getCacheControl({ scope, querySource })` (`src/services/api/claude.ts`) returns an `{ type: 'ephemeral', ttl?, scope? }` marker:

- **TTL.** Default ephemeral is 5 minutes; a **1-hour** TTL is granted only to eligible users (Anthropic staff or Claude.ai subscribers not in overage), gated behind a GrowthBook flag with a `querySource` allowlist (`src/services/api/claude.ts`). The eligibility is resolved once and cached in bootstrap state so it can't flip mid-session.
- **Placement.** At most one cache marker each on the **last user-message block** and the **last tool-schema block** (`src/services/api/claude.ts`) — caching the long stable prefix without exceeding Anthropic's breakpoint budget.
- **Global scope.** The system-prompt prefix (before the dynamic boundary) can use `scope: 'global'` for cross-organization cache reuse.
- **Cache references.** Microcompaction reuses cached tool inputs by `tool_use_id` via `cache_references` (`src/services/api/claude.ts`) rather than resending them — caching keyed on tool-call identity, not full content.

## Tool calls over the wire

Claude Code speaks **Anthropic-native** tool calling. The response streams `tool_use` content blocks; the loop filters for `type === 'tool_use'` (`src/query.ts`), preserves each `tool_use.id`, runs the tool, and sends back matching `tool_result` blocks keyed by `tool_use_id`. Because `stop_reason === 'tool_use'` is unreliable, the loop detects tool calls by watching the *stream* for `tool_use` blocks rather than trusting the stop reason. A normalizer guarantees every `tool_use` gets a paired `tool_result`, even on interrupt.

## The four harnesses, briefly

The other three reach the same Anthropic endpoint (and others) through abstraction layers rather than the SDK directly:

| Dimension | Claude Code | OpenCode | pi | code_puppy |
|---|---|---|---|---|
| **Client** | Anthropic SDK (`client.ts`) | custom Effect protocol layer | Anthropic SDK, wrapped | pydantic-ai `AnthropicModel` |
| **Tool response** | native `tool_use` | schema-validated (Anthropic *or* OpenAI) | `tool_use` → normalized + name-mapped | pydantic-ai abstraction |
| **Cache TTL** | 5m/1h, eligibility-gated + allowlist | 5m/1h, max 4 breakpoints | 5m/1h, `PI_CACHE_RETENTION` env | wrapper (`ClaudeCacheAsyncClient`) |
| **Cache placement** | last user msg + last tool block; global-scope prefix | per-block, capped at 4 | per-block | system blocks |
| **System prompt** | modular cached sections + boundary | agent-defined string array | `buildSystemPrompt()` sections | pydantic-ai `.system_prompt` |
| **Context files** | hierarchical + `@include` + hooks | agent/provider-explicit | upward walk, `AGENTS.md`/`CLAUDE.md` | plugin-driven (optional) |

The pattern mirrors the [loop-ownership axis](comparison.md#three-architectural-axes): Claude Code owns its wire format (and squeezes the most out of caching); OpenCode and code_puppy delegate it to a protocol layer or framework that normalizes across providers; pi sits in between, wrapping the SDK but mapping tool names to Claude Code's canonical set.

## Sources

- `src/services/api/client.ts`, `src/services/api/claude.ts` (caching), `src/constants/prompts.ts` + `systemPromptSections.ts` (system prompt), `src/constants/system.ts` (prefix, attribution), `src/utils/claudemd.ts` (memory/context), `src/query.ts` (tool_use parsing)
- Other harnesses: see each [profile](harnesses/) and [methodology](methodology.md)

## Related

- [Claude Code Events & Hooks](claude-code-events.md) · [Tool Handling](tool-handling.md) · [Comparison Matrices](comparison.md)
