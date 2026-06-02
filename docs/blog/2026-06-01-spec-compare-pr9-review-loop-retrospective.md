# Retro raw material — spec-compare PR #9: the review loop vs. a rate-limited reviewer

**Session date:** 2026-05-31 evening → 2026-06-01 (UTC)
**Project context:** Orchestrated from `agentic-harnesses` (a coding-agent-harness loop visualizer), but the work itself was the review-and-merge workflow for `cameronsjo/spec-compare` PR #9 — a May 2026 reassessment PR (39 files, +941/−155). The real domain of this session is agentic workflow tooling: CodeRabbit review loops, the cadence skill ecosystem, and what "reviewed" actually means when your reviewer is a rate-limited bot.

---

## Decisions Made

### Re-trigger CodeRabbit despite the standing "comment triggers do nothing" rule
- **What:** Posted `@coderabbitai review` on a PR whose check was already green.
- **Alternatives:** Trust the green check and merge (rejected — the only CodeRabbit comment was a rate-limit warning; no review ever ran). Push an empty commit to force a content change (unnecessary).
- **Reasoning:** The user's global CLAUDE.md says comment triggers are no-ops because CodeRabbit's incremental review is content-cached — but that rule only applies when the content *was already reviewed*. Here the content was never reviewed, only rate-limited. The rate-limit comment itself documents the re-trigger path.
- **Confidence:** Settled — validated by outcome. A real 14-finding review arrived ~7 minutes later.

### Run build/test verification concurrently with review polling
- **What:** Kicked off `npm ci && npm run build` and `npm test` in background Bash tasks while sleeping/polling for CodeRabbit.
- **Reasoning:** The verification gate (evidence before merge) was required regardless of which review path happened, so serializing it behind the poll was pure wasted wall-clock.
- **Confidence:** Settled.

### Fix everything, dismiss nothing — including findings CodeRabbit itself called "Low value"
- **What:** All 14 round-1 findings fixed (5 inline + 9 outside-diff), all 3 round-2 findings fixed. Zero dismissals.
- **Alternatives:** The use-case-scoring ASCII-table fence finding was tagged "🔵 Trivial | 💤 Low value" by CodeRabbit itself, with "or ignore the warning" as an offered option.
- **Reasoning:** The review-loop skill is explicit: "Default action: fix it. Every severity. Every nitpick. No exceptions," and dismissal requires user consent the session didn't have a reason to request.
- **Confidence:** Settled as process; individual fixes are trivially low-risk.

### Fix the unflagged fifth "Recent Changes" heading too
- **What:** CodeRabbit flagged 4 of 5 stale `## Recent Changes (…, February 2026)` headings across the tool docs. kiro.md had the identical problem on line 88 but wasn't flagged (only its pricing line was). Fixed it anyway.
- **Alternatives:** Strict minimal-change discipline — touch only flagged lines.
- **Reasoning:** Renaming 4 of 5 stale headings to "Historical Changes" while leaving the fifth as "Recent" would ship the exact inconsistency the findings were about, just one file over.
- **Confidence:** Settled.

### "Historical Changes" rename instead of extending the changelogs
- **What:** All five `## Recent Changes (vX, February 2026)` headings became `## Historical Changes (vX, February 2026)`.
- **Alternatives:** CodeRabbit's other offered fix — extend each section with entries up to the current versions (v1.3.1, v0.8.18, v3.1.9, etc.).
- **Reasoning:** Extending changelogs means researching months of release notes per tool — out of scope for a review-fix round. The rename is the minimal honest fix: the content really is historical.
- **Confidence:** Good enough for now. The sections still describe February 2026; a future sweep could extend them.

### Dynamic `{tools.length}` over the literal "Thirteen"
- **What:** `App.tsx`'s hardcoded "Eleven spec-driven-development tools" became `{tools.length} spec-driven-development tools`.
- **Alternatives:** CodeRabbit offered both "Thirteen" (literal) and the dynamic expression.
- **Reasoning:** The PR being reviewed exists *because* hardcoded counts drift — it was a reassessment correcting stale data. And the badge three lines below already used `{tools.length}`, so the pattern was proven in the same component.
- **Confidence:** Settled.

### Finding-scoped lint fixes, not file-wide sweeps
- **What:** Added blank-lines-after-headings only at the 14 flagged locations, even though `docs/sources.md`'s *entire pre-existing style* (every `###` in the file) violates MD022.
- **Alternatives:** (a) Sweep the whole file lint-clean — bigger diff, touches lines the PR never touched. (b) Run `markdownlint-cli2 --fix` — would also auto-fix unrelated rules, noisy diff. (c) awk one-liner insertion — risks matching `#` comment lines inside fenced code blocks.
- **Reasoning:** CodeRabbit only flags diff-adjacent lines; pre-existing violations on untouched lines won't appear in the re-review. Smaller diff = smaller re-review surface = faster convergence of the loop.
- **Confidence:** Good enough for now — the file is internally inconsistent (new headings have blank lines, old ones don't), which is invisible in rendering but real in source.

### Verify CodeRabbit's arithmetic before applying its score corrections
- **What:** Round 2 claimed the Superpowers and Traycer "Overall" scores were miscalculated (3.9 should be 4.0, 3.5 should be 3.6). Before editing, recomputed the mean for **all 13 rows** of the table to confirm (a) the table's invariant really is "Overall = mean of the 7 columns" and (b) only the two newly added rows broke it.
- **Reasoning:** A reviewer's premise can be wrong even when its symptom is right (a prior session's memory captures exactly this). If "Overall" had been a weighted score or sourced from a different methodology, "fixing" it to the mean would have corrupted it.
- **Confidence:** Settled — every pre-existing row matched mean-of-7 to one decimal; the invariant was real.

### Hard-stop the loop and self-review when the rate limit escalated
- **What:** After round 2's fixes, CodeRabbit was rate-limited twice trying to review the final 11-line commit — first with a "10 minutes 43 seconds" recovery, then (after waiting it out and re-triggering) "54 minutes 58 seconds" plus "your organization has run out of usage credits." Deleted the cron, hard-stopped the loop with reason `stale`, self-reviewed the remaining delta, merged.
- **Alternatives:** Keep waiting and re-triggering (potentially forever — credits were exhausted); ask the user what to do.
- **Reasoning:** The approved plan had an explicit branch for this: "If CodeRabbit still blocked (out of credits) → review it ourselves." And the unreviewed delta was 1 file, 11 lines, docs-only, implementing CodeRabbit's *own proposed fixes* verbatim — the marginal value of waiting an hour for the bot to approve its own suggestions was nil.
- **Confidence:** Settled. The plan pre-authorized it; the delta was self-evidently low-risk.

### Codify one finding into the rules repo, skip the others
- **What:** Per the CodeRabbit Feedback Loop rule, evaluated all findings for codification. Added one rule to `cadence-rules/rules/project/languages/javascript.md`: parse errors from disk reads must name the offending file. Did *not* add markdown rules.
- **Reasoning:** The MD022/MD040 guidance already existed in `rules/user/markdown-formatting.md` ("MUST include blank lines around headings", "MUST use fenced code blocks with language identifiers") — the PR's docs violated an existing rule; codifying it again would be a duplicate. The JSON.parse-with-filename-context pattern was genuinely absent and genuinely recurring (any tool scanning a directory of JSON configs).
- **Confidence:** Settled.

---

## Friction & Dead Ends

### The green check lies, and it lied twice in one session
The whole session existed because CodeRabbit's status check showed SUCCESS on a PR it never reviewed — the "review" was a rate-limit warning, but the check still went green. Then it happened *again* mid-session: after the round-2 fix push, the check went green with description "Review completed" while the summary comment said "Review limit reached… we couldn't start this review." The status-check color is a statement about run completion, not review existence. The tell in the API: the commit-status history showed `queued → in progress → success` in **8 seconds** for the bogus pass; the real review of the same content took ~7 minutes.

### Rate-limit recovery estimates escalate instead of resolving
First block: "More reviews will be available in 10 minutes and 43 seconds." Waited ~10.5 minutes, re-triggered, got acked — and then immediately blocked again with "54 minutes and 58 seconds" plus the out-of-credits line. The recovery estimate is not a promise; under credit exhaustion it apparently regenerates per attempt rather than counting down to availability.

### CodeRabbit's review body is an HTML/markdown matryoshka
The 9 outside-diff findings can't be posted as inline comments (GitHub API limitation), so they ride in the review body as nested `<details>` blocks — 518 lines of mixed markdown, HTML, and blockquote-prefixed text. The first `--jq` query truncated at 3000 chars and silently hid 6 of the 9 findings. Required dumping the raw body to a file and reading the whole thing. Naive parsing of "what did the reviewer say" undercounts findings.

### A duplicate finding for code that was already fixed
Round 2 included a "Duplicate comments (1)" entry re-flagging the superpowers.md fence as missing a language tag — but round 1's fix had already changed it to ` ```bash `, the inline thread was resolved, and the file on disk was correct. It was a no-op artifact of reviewing the diff range (the old side of the diff still had the bare fence). Acting on it blindly would have produced a nonsense edit.

### A second "Review triggered" ack nobody asked for
At 01:01:06 a second CodeRabbit ack appeared, ~5 minutes after the only trigger comment the session posted. Never explained — possibly a concurrent Claude session (the user runs several), possibly a CodeRabbit internal retry. Cost nothing this time, but it's the kind of ghost activity that makes "did my trigger work?" undecidable from the ack alone.

### Small shell papercuts
- `echo ===` in zsh fails with `(eval):1: == not found` — zsh treats leading `=` as filename expansion. Separators in compound commands need quoting.
- The Bash tool's working directory resets between calls; every spec-compare command needed `git -C` or an absolute `cd`.
- The stale CLAUDE.md path: the CodeRabbit Feedback Loop rule points at `~/Projects/claude-configurations/rules/rules/languages/<lang>.md`, which doesn't exist. The real path is `cadence-rules/rules/project/languages/`. Ten minutes of directory spelunking to deposit one rule.

### The loop is real: fixes breed findings
Round 1 fixed 14 findings; the re-review of those fixes surfaced 3 *new* findings — not on the fix lines themselves, but on adjacent lines the incremental review now looked at (the score arithmetic had been wrong since the PR's original commits; CodeRabbit only noticed when the fix push made it re-read that file). "Treat the first batch as exhaustive" is a named anti-pattern in the review-loop skill for a reason.

---

## Opinions Formed

- **A green check from an incremental reviewer is worse than no check.** It encodes "the run finished," which humans inevitably read as "the code passed review." Two false-greens in one session. The trustworthy signals are all in the comment bodies and the status-history timing — an 8-second "review" of 39 files is not a review.

- **Review-loop state files should outlive their loop.** The PR #8 loop's state file (found half-overwritten at loop start) carried notes that were directly load-bearing for PR #9: CodeRabbit's API login is `coderabbitai[bot]` not `coderabbitai`, it re-reviews ~30 seconds after a push, and its "approval" is the *absence* of new findings plus resolved threads — it never posts APPROVED. Carrying gotchas forward in the state file's prose body turned out to be the cheapest knowledge transfer mechanism in the whole system.

- **CodeRabbit's ASSERTIVE profile earns its keep on docs-heavy PRs.** It caught real arithmetic errors in an ASCII table (28/7 rendered as 3.9), a star-count contradiction between two lines of the same doc, and version-string drift across three files. That's not lint noise; that's the tedious cross-referencing nobody does by hand. The lint nitpicks are the tax you pay for the verification.

- **A rate-limited reviewer is not a stale reviewer, and loop tooling should know the difference.** The skill's stale timer assumes silence means "nothing is coming." A rate-limit warning with a recovery ETA is the opposite — something is definitely coming, just later. The session handled it by manually bumping `stale_minutes` with a justification note, but that's a workaround for a missing concept.

- **Plans with pre-authorized fallback branches are what make autonomous sessions mergeable.** The decision that mattered most — "stop waiting for the bot and merge" — wasn't made in the session at all. It was made at plan time ("If CodeRabbit still blocked → review it ourselves"), which meant the session could execute it without either stalling for an hour or making an unauthorized judgment call.

---

## Implementation Notes

### The review-loop state file (the core artifact)
`.review-loop.local.md` — YAML frontmatter + prose log, gitignored, one per repo:

```yaml
prs:
  - number: 9
    repo: cameronsjo/spec-compare
    branch: reassess/2026-05
    status: pending          # pending | fixing | clean | paused
    last_push_sha: "685fe50…" # review must target THIS sha before clean
    rounds_with_findings: 2   # feeds the reflection prompt at >= 3
    reflection_offered: false
    approval_source: null     # formal_review | coderabbit_no_actionable | …
    notes: "…gotchas carried forward between loops…"
```

The two fields doing the most work: `last_push_sha` (a PR cannot transition to `clean` until an approval-equivalent signal exists *for that exact commit*) and `approval_source` (forces the loop to name which signal it trusted, since CodeRabbit never posts a formal APPROVED review).

### Push verification, every push
```bash
LOCAL_SHA=$(git rev-parse HEAD)
git push origin reassess/2026-05
REMOTE_SHA=$(gh api repos/OWNER/REPO/git/ref/heads/BRANCH --jq '.object.sha')
[ "$LOCAL_SHA" = "$REMOTE_SHA" ] && echo "PUSH_VERIFIED" || echo "MISMATCH"
```

### Detecting the bogus green check
```bash
# Status history per context — the timing exposes fake reviews:
gh api repos/OWNER/REPO/commits/SHA/statuses \
  --jq '.[] | {context, state, description, updated_at}'
# queued → success in 8s  = no review happened
# queued → success in ~7m = real review
```

### The finding count ledger
- Round 1 (full review of 38 files): 14 findings — 5 inline (MD022 ×3 files, MD040, JSON.parse error context) + 9 outside-diff (4 stale "Recent Changes" headings, stale "Recommended Stacks" date, star-count contradiction, Kiro pricing, ASCII-table fence, hardcoded tool count)
- Round 2 (incremental review of the 14-file fix): 3 findings — score arithmetic ×2 rows, dependent narrative, version-label drift — plus 1 stale duplicate
- Round 3: never happened (rate limit + credit exhaustion); 11-line delta self-reviewed per plan

### What I'd do differently
The use-case-scoring ASCII heatmap is hand-maintained while the site's heatmap derives from the tool JSONs — that's exactly the docs-drift the PR's own `gen-doc-tables.mjs` was built to kill. The arithmetic error CodeRabbit caught could not have existed if that table were a GEN block. Generating it was out of scope for a review round, but it's the obvious next move.

---

## Quotable Moments

The human author sent essentially no free-form prose this session — the inputs were an approved plan document (drafted in a prior session), a `/cadence:retro` invocation, and tool-permission grants. There are no verbatim author quotes to preserve.

Plan-document language the author approved (Claude-drafted, not author-spoken):
- "The PR's CodeRabbit status check shows **SUCCESS, but no review ever happened**"
- "CodeRabbit outcome documented (review happened, or credit-block confirmed with the actual comment body — **never trust the green check**)"

---

## Open Threads

- **The CodeRabbit org is out of usage credits.** Future PRs in `cameronsjo/*` repos won't get reviewed until credits are purchased or the cycle resets. The next review-loop run will hit this immediately.
- **The stale CLAUDE.md rules path** (`rules/rules/languages/` → actually `cadence-rules/rules/project/languages/`) is captured in auto-memory but the CLAUDE.md itself still says the wrong thing.
- **"Historical Changes" sections still end at February 2026.** Renaming was the honest minimal fix; actually extending the changelogs to v1.3.1 / v0.8.18 / v3.1.9 / v6.8.0 / v0.12.x is deferred indefinitely.
- **The unexplained second "Review triggered" ack** — if it was a concurrent session, two sessions were touching the same PR without coordination. Worth checking before the next multi-session evening.
- **Should `gen-doc-tables.mjs` also generate the use-case-scoring heatmap?** It would have made round 2's arithmetic findings structurally impossible.
- **The review-loop skill could model "reviewer blocked with ETA"** as distinct from "reviewer stale" — this session faked it by bumping `stale_minutes` with a prose justification, twice (PR #8 did the same).

---

## Honesty flags

- **The "Opinions Formed" section is inferred.** The human author expressed no opinions this session (they sent no prose). Every opinion above is reconstructed from the *decisions the executing agent made and documented* — they are positions the session's work supports, not positions the author stated. Treat them as candidate takes to confirm or reject, not as the author's voice.
- **The decisions and their reasoning are reliable** — they come from the session's own visible deliberation (the agent's documented reasoning at decision time), not reconstruction. Confidence tags are my read of how settled each one looked, not the author's stated confidence.
- **The "Quotable Moments" section is honest about its emptiness** — the two quoted lines are from the plan document, which the author approved but did not write. Do not attribute them as spoken quotes.
- **The duplicate-ack explanation (concurrent session vs. CodeRabbit retry) is speculation.** Neither was confirmed.
- **Timeline precision:** timestamps (01:03:55Z review, 8-second bogus check, "54 minutes 58 seconds") are taken directly from API output captured in the session and are exact. Durations described as "~7 minutes" are approximations from comparing those timestamps.
