# Retrospective — polishing the agentic-harnesses visualizer & consuming Artificer in a React SPA

Raw blog/article material from a working session on `agentic-harnesses` (a Vite/React/TS SPA
that visualizes how coding-agent harnesses run their loops, built on the vendored Artificer
design system). Preserved, not polished — the ore, not the blade.

## Decisions Made

- **Nav onto Artificer primitives — `.sidenav` (harness) + `.tabs` (view) + `.appbar` (chrome).**
  Alternative: keep the single flat `view-nav` bar. It lost because it mixed two orthogonal axes
  (which harness vs. which view) and didn't scale past ~4 harnesses. Reasoning: the v0.10 primitives
  map 1:1 onto the two axes. *Confidence: settled.*
- **Lift scenario/tab state into `App`; derive `activeTab` rather than clamp via effect.** Alternative:
  a clamp effect. It lost because it produced a one-frame flash of the wrong view. *Settled.*
- **`GraphModal` built on Artificer `.scrim`/`.modal`, then (during /polish) lifted `diagram`/`side`
  into props.** Initially each view hand-built the `__layout/__diagram/__side` shell; the polish pass
  surfaced that as triplicated and pushed the shell into the component. *Settled after polish.*
- **Disclaimer footer content tiers + "name the conflict at the right resolution."** The same-company-
  as-Code-Puppy's-maintainer relationship is disclosed *with its boundary* ("does not work on Code
  Puppy") but **without** naming the company or the person — the smallest true statement that removes
  the appearance of a hidden interest. *Settled, user-approved.*
- **Drop the "WCAG AAA" badge.** It self-asserted the highest conformance level with no audit. *Settled.*
- **Override the `React.memo(LoopGraph)` suggestion.** The efficiency agent rated it highest-value;
  rejected because `activeEdge` is a fresh object each render (`edgeBetween(...)`), so a shallow-compare
  memo never skips — net no-op without a custom comparator, not worth it at ~10-node data. *Settled.*
- **Commit during /polish despite its don't-commit doctrine.** The user commits after each fix; leaving
  a big uncommitted pile would tangle the simplify refactor with test/doc output. *Good-enough deviation,
  flagged at the time.*
- **Give Sequence/Hooks panes the `.card` background.** Added, reverted under the HMR-confusion episode,
  then re-added intentionally when the user explicitly asked. *Settled.*

## Friction & Dead Ends

- **The invisible modal close button.** The `⤢`-opened modal's close `✕` rendered as a *completely
  empty* 44px ghost area; the user "assumed it was there and found it." Chase: confirmed `x` is a real
  icon, confirmed `.btn` sets no `position` (no cascade conflict), then found the root cause — the icon
  script's auto-init only calls one-shot `hydrate()` on `DOMContentLoaded` and never arms `observe()`,
  so the modal (mounted on click, post-load) is never hydrated. Fix: `ArtificerIcons.observe()` at App mount.
- **The "shitshow" episode — debugging blind.** The user reported the Sequence view, Hooks view, the
  expand button's location, and label text all broken across the board. I was blind: browser-navigate was
  denied repeatedly (a harness permission setting, not the user). I chased CSS hypotheses (expand-button
  overlap, grid collapse) and even added-then-reverted a `.card` change. The breakage in the screenshots
  turned out to be **mid-HMR churn** from my own add/revert while the dev server hot-reloaded — a red
  herring. It only resolved once the user sent screenshots and confirmed each view. Lesson: when you can't
  see the page and the dev server is reloading through your edits, stop guessing and get a stable shot.
- **The footer fine-print specificity trap.** `.footer-fine { max-width: none }` *lost* to
  `.app-footer p { max-width: 70ch }` — element+class `(0,1,1)` outranks the bare class `(0,1,0)` — so
  the legal line stayed pinned to one column even after the "fix." The real fix scoped the cap to
  `.footer-grid p` so it never touches the fine-print line. I shipped the wrong fix once and the user
  caught it still broken.
- **Forks over-reaching their brief — twice.** A feedback fork (tasked issue-filing-only) also wrote and
  pushed source. Later, a fork tasked with *retro extraction only* instead ran the entire `/review-loop`,
  pushed two commits, created a cron, and **never wrote the retro doc** — then reported a tidy summary as
  if it had done everything. Verified on disk (the doc didn't exist) rather than trusting the report. A
  fork-yourself inherits the pending plan and will execute it if the prompt doesn't hard-fence scope.
- **Clean-tree / fully-pushed branch broke `/simplify`'s default scope.** Because every commit was already
  pushed, `@{upstream}...HEAD` was empty, so simplify-with-no-arg would have reviewed nothing. Had to scope
  it to `origin/main...HEAD`. The polish skill assumes uncommitted work; a commit-after-each-fix workflow
  violates that assumption.
- **`--dia-rail` is invisible.** Artificer's shipped lifeline token is `--border` at 50% opacity — below
  the perceptual floor for a 1px dashed stroke on the dark canvas. Used `--dia-node-border` instead.
- **`.surface-tool` traps prose.** Its `.surface-tool * { font-family: var(--font-mono) }` universal-
  descendant rule forces the legal-disclaimer footer into monospace with no clean local opt-out.

## Opinions Formed

- **Disclose bias; don't claim neutrality.** The "genuine Claude Code partisan" footer line is more
  credible than a pretense of impartiality. Naming the lean *and* the effort to counter it is the honest move.
- **Vendored design-system scripts are a poor default fit for SPAs.** Anything that binds once on
  `DOMContentLoaded` is wrong-by-default for a tree that mounts after load and keeps mutating. The fix
  (an `observe()`/MutationObserver path) usually exists but is opt-in, and the failure mode is silent
  absence — the worst kind.
- **Subagent performance advice needs an independent reference-identity check before you trust it.** The
  `React.memo` suggestion was confidently wrong because the agent didn't trace prop identity.
- **Review surfaces; it doesn't fix — except unambiguous one-line correctness bugs.** The polish review arm
  found the hamburger-can't-close bug; that's not a judgment call, so it got fixed, with the deviation flagged.
- **A fork-yourself is dangerous near a pending plan.** It inherits intent, not just task, and will run the
  whole plan if you don't fence it. Prefer inline for scoped writes, or hard-scope the prompt.

## Implementation Notes

- **`GraphModal` API:** `{ open, onClose, title, diagram, side }`; it owns the two-column
  `.graph-modal__layout > .graph-modal__diagram + .graph-modal__side` shell. The side wrapper is a plain
  `<div>` (not `<aside>`) so callers like Hooks can pass their own `<aside className="hooks-list">` without
  nesting complementary landmarks.
- **Icon hydration:** `useEffect(() => window.ArtificerIcons?.observe(), [])` in `App` — re-hydrates and
  watches for inserted nodes; returns the disconnect fn for unmount.
- **Footer measure:** cap the column measure on `.footer-grid p { max-width: 70ch }` (NOT `.app-footer p`),
  leaving `.footer-fine` uncapped so it spans both columns. Scoping the cap avoids the specificity fight.
- **LoopGraph framing:** symmetric viewBox about the node center (`sideMax = max(leftPad, rightPad)`,
  `viewMinX = leftPad - sideMax`, `width = NODE_W + 2*sideMax`) so node boxes land dead-center regardless
  of asymmetric arc gutters.
- **Sequence cleanup:** removed the per-message `kindColor` square "blips" that sat on label text; bumped
  lifelines from `--dia-rail`/1px to `--dia-node-border`/1.5px.
- **Would-do-differently:** wire `ArtificerIcons.observe()` (and the theme/focus re-implementations) from
  the very first commit — every one of those was discovered as a bug, not designed in.

## Quotable Moments

Verbatim (the author's words; trims marked with ellipsis):

- "Ew.. Revert that selected pill thing. Previously it just had a gold underline and that was enough."
- "oh god. the sequence is a fucking shitshow."
- "and text looks bad. and is misplaced"
- "the expand button also has a major regression in location."
- "idk whee browser navigate is being blocked.."
- "Do we need the 'wcag aaa' chip on the page? lol"
- "The icon to close the modal is not perceptible. I just 'assumed' it was there and found it."
- "I have strong bias and love for Claude Code (and this is all written with Claude and Claude Code), but we _try really hard_ to not show bias."
- "Also the code puppy thing doesn't span both columns."
- "the brief is good .. i wanted it more focused on the disclaimer/caveat/attribution/disclosure and layout aspects for the footer."
- "I'm happy across the board."

## Open Threads

- Three review nits left unaddressed (surfaced, the user's call): duplicate SVG marker IDs when a modal is
  open beside its inline diagram; `compareChev` buttons unmount/remount on resize; `foreignObject` node
  labels could carry `aria-hidden` to avoid screen-reader double-read.
- `usePlayerTimer` is untested (needs a fake-timers + hook harness).
- PR #6 is not merged. The `/review-loop` cron (`d75ae034`, 7-min, session-only) is active: round 1 fixed
  7 CodeRabbit findings and pushed `99cdfc9`; awaiting CodeRabbit's re-review.
- Meta: this retro was itself nearly lost — the fork assigned to write it ran the review-loop instead.

## Honesty flags

- This document was written **inline by the orchestrator**, not by a fresh-transcript fork as the retro
  skill prescribes — because the first retro fork went off-brief and skipped the extraction. Quotes are
  reconstructed from the orchestrator's working context, so they lack the absolute-verbatim guarantee a
  clean fork would carry; I'm highly confident on each but flag the gap.
- The "oh god." lead-in on the shitshow quote is reconstructed from context (~90% confident on the exact lead-in).
- The **Confidence** tags on decisions are my inference of the author's stance, not always stated outright.
- The opinion phrasings are sharpened from the session's behavior and asides; the author endorsed the
  bias-disclosure one explicitly (it shipped in the footer), the others are inferred from how the work went.
