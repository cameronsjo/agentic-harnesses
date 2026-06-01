# Retrospective — mobile-friendliness pass (2026-05-31)

Raw blog ore. Captured mid/post-session by `cadence:retro`. Not an article.

**Scope:** A mobile-friendliness pass across two sibling Vite+React+TS visualizer SPAs that vendor Cameron's own **Artificer design system** — `agentic-harnesses` (renders coding-agent harness loop diagrams from JSON specs) and `spec-compare` (renders spec-driven-development tool workflows, feature matrix, scoring heatmap). Plus filing structured friction back upstream to `cameronsjo/artificer-design-system`. Cameron's stance, stated: he's "artificer to the core" — he cares about these details.

---

## Decisions Made

### Compare view → swipe carousel on mobile
- **What:** Below 800px, the headline "Compare all" view becomes a one-card-per-screen swipe carousel (CSS scroll-snap) with a dot pager.
- **Alternatives:** (a) stack the cards vertically like every other view's 800px reflow; (b) keep the horizontal filmstrip but improve touch affordances. Presented as an `AskUserQuestion` with ASCII previews of each.
- **Reasoning:** Cameron explicitly picked "Swipe carousel" over the recommended "Stack vertically." Stacking was the *consistent* choice (matches every other 800px reflow) and was tagged Recommended; he overrode it for the focused single-card read.
- **Confidence:** Settled (user-chosen). Note the recommendation lost to the user's preference — worth remembering the orchestrator's "recommended" isn't the author's pick.

### Full-bleed cards (not peek, not tighten-gap)
- **What:** Mobile carousel cards span edge-to-edge; the rest of the page keeps its 24px gutter.
- **Alternatives:** "Peek next card" (recommended — a sliver of the next card visible, intentional right-side spacing) vs "Full-bleed" vs "Tighten the swipe gap." Again an `AskUserQuestion` with previews.
- **Reasoning:** Cameron picked Full-bleed over the recommended Peek. The trigger was his observation that at-rest the carousel felt "boxed" with dead page-margin: *"the uneven 'whitespace' from the lack of padding/margin on the right side of the carousel is distracting."* Measurements proved it was symmetric at rest (24px both sides), so the fix targeted the *feel*, not a real asymmetry.
- **Confidence:** Settled.

### Hamburger glyph size + contrast — the long saga
- **What (size):** `data-icon-size` walked 16 (default) → 22 → 26 → 30 → 36 → **settled at 32**.
- **What (contrast):** First bumped to full `--fg`; later reverted to the `.btn--ghost` default `--fg-secondary`.
- **Alternatives/path:** Started at the Artificer `menu` glyph's 16px default. Cameron: "the hamburger menu glyph is .. oof," then "I think it's just that the glyph is too small," then "i still feel like the glyph is too small," then "let's do 36 size glyph so i can see 30 vs 36 (or is there's a better logical increment higher than 30)" → picked 32 from a 30/32/36 question. Then much later: "I think the hamburger menu glyph is way too bright" → reverted full `--fg` → `--fg-secondary`.
- **Reasoning:** The glyph button is 44px; 36 leaves ~4px padding (near the ceiling), 32 is the rounder middle. On brightness: full `--fg` (`#e8e6e1` near-white) glared on the dark bar; `--fg-secondary` (`#c5c8c6`) reads clearly at 32px without glare — and aligns with Artificer's own intent for ghost icon buttons.
- **Confidence:** Settled, but arrived at iteratively over many turns — not first-try.
- **Side note:** Early on, an investigation thought the Artificer `menu` path itself was cramped (bars at y=6/8/10 in a 16-tall viewBox, 2px gaps). Cameron walked that back: "I think it's just that the glyph is too small." So the fix stayed size-only (no path override), keeping the library glyph.

### Drop chevrons on mobile (vs keep + fix)
- **What:** Hide the carousel chevron pager below 800px; keep swipe + tap-dots. Chevrons remain on the desktop filmstrip.
- **Alternatives:** Keep chevrons on mobile but (1) make them center-on-card like a swipe and (2) pin them at a fixed vertical position.
- **Reasoning:** Cameron's two nitpicks were both chevron-rooted: behavior mismatch (chevron vs slide) and vertical centering ("the chevron buttons aren't centered per each diagram... but i definitely don't want some dramatic movement/placement that recenters it based on the diagram either"). The tap-dots already jump to any card, so chevrons are redundant on touch — which is *why spec-compare (dots-only) was never flagged*. He chose "Drop on mobile."
- **Confidence:** Settled.

### Chevron centering on desktop — unify the math
- **What:** Even after dropping mobile chevrons, Cameron added: "i still think the chevron scroll needs to use the same center-on math for non-mobile." `page()` rewritten to `scrollToCard(clamp(active + dir))` — the same center-on math the dots and swipe use.
- **Alternatives:** Leave desktop's raw `scrollBy(clientWidth * 0.8)`.
- **Reasoning:** Sliding "centers" the diagram correctly; the chevron's raw `scrollBy` landed off-center. Unify so all three navigations (swipe, dots, chevron) settle identically. Verified a desktop chevron click centered the target card to **0px offset** from viewport center.
- **Confidence:** Settled, verified.

### Verify in a real browser via `agent-browser`, not the Chrome MCP
- **What:** Switched from the `claude-in-chrome` MCP to the `agent-browser` CLI for all responsive verification.
- **Alternatives:** Chrome MCP (failed) or Playwright (Cameron's suggested fallback).
- **Reasoning:** Chrome MCP `navigate` returned "Permission denied by user" twice, and Cameron diagnosed it: "It's probably connecting to the wrong chrome instance. and not the one that's local! Can you use agent browser or playwright?" `agent-browser` launches its own controllable Chrome; `eval` gives ground-truth geometry.
- **Confidence:** Settled — saved as an auto-memory (`verify-local-dev-with-agent-browser`).

### Land spec-compare fix on main via cherry-pick (not merge) given open PR #9
- **What:** Cherry-pick the single mobile-fix commit onto `main` and push, rather than merging the `fix/mobile-friendliness` branch.
- **Alternatives:** Merge the fix branch → would drag all 9 in-flight `reassess/2026-05` commits into main (the fix branch was cut from reassess).
- **Reasoning:** Cameron picked "Into main + push" knowing main was behind reassess. Cherry-pick deploys *only* the mobile fix. Verified the open PR #9 (`reassess/2026-05`) stayed `MERGEABLE`/`CLEAN` afterward via both `git merge-tree` (clean tree, no conflict files) and `gh pr view 9 --json mergeable`.
- **Confidence:** Settled, but left an Open Thread (reassess doesn't carry the fixes).

### File two upstream issues, not one
- **What:** #114 (hamburger glyph size/contrast slice) filed early; then #116 (the broader "responsive app-shell/mobile-layout layer is unowned" pivot, referencing #114). Plus second-consumer comments added to #116 and #83 after spec-compare confirmed the pattern.
- **Reasoning:** One issue per coherent pivot (the artificer-feedback standing directive). The glyph and the layout layer are distinct pivots. Cameron prompted the broader one: "I think a lot of this is stuff that needs to be fixed in artificer-design-system, because ../spec-compare needs a lot of the same fixes too."
- **Confidence:** Settled.

---

## Friction & Dead Ends

### The first carousel "fix" silently did nothing — two stacked CSS bugs
Shipped a carousel (scroll-snap, `flex-basis:100%`, dot pager), claimed it worked off a green build + tests. Cameron, looking at the real browser: **"carousel is still not working right. it's still hanging out wayyy to the right."** Build/tests were green because the bugs were runtime layout, invisible to `tsc`/vitest. `agent-browser` `eval` exposed them:
- `pageOverflow: 2066px` at a 390px viewport; `.compare-grid` was 2432px wide (not clipping).
- `colFlexBasis: "290px"` — the mobile override hadn't applied.

Two root causes, both subtle:
1. **`1fr` ≠ shrinkable.** Mobile `.app-shell { grid-template-columns: 1fr }` resolves to `minmax(auto, 1fr)`, whose `auto` minimum *refuses to shrink below content min-content* — so the wide filmstrip pushed the whole page sideways. Desktop used `minmax(0, 1fr)` (shrinkable), which is why desktop clipped-and-scrolled but mobile blew out. Fix: `minmax(0, 1fr)` on mobile too.
2. **Source-order loss.** The mobile `.compare-col { flex-basis: 100% }` rule was placed *before* the desktop `.compare-col { flex: 0 0 290px }`. Equal specificity → later rule wins → cards stayed 290px. Fix: move the media block *after* the desktop rule.

The lesson that stuck: static CSS reasoning had too many "shoulds." Before this, the agent had reasoned at length about `minmax`/`overflow`/min-content and still shipped broken code. The browser `eval` (`document.documentElement.scrollWidth - window.innerWidth`, `getComputedStyle`, `getBoundingClientRect`) was the thing that found the truth.

### Chrome MCP drove the wrong Chrome; "you shouldn't be getting blocked"
Before `agent-browser`, the `claude-in-chrome` MCP `navigate` to `localhost:5176` returned **"Permission denied by user"** — twice. The agent (correctly) stopped retrying, but the real problem wasn't permissions. Cameron, frustrated and trying to help: "Help me understand what you're trying to do and what tools. You shouldn't be getting blocked." Then the diagnosis: "It's probably connecting to the wrong chrome instance. and not the one that's local! Can you use agent browser or playwright? Help me help you." The agent had also been confused because its changes were *uncommitted/un-deployed* — Cameron could have been looking at the live GitHub Pages build with none of the fixes, which muddied "still not working."

### Card stretch-to-tallest dead space — "damn that looks bad."
After full-bleed shipped, a screenshot showed the short "BMad Method" card (4 nodes) padded out with a huge empty band below its caption. Cause: `.compare-grid` is a flex row with default `align-items: stretch`, so every card stretched to the *tallest* tool's diagram. Fine for desktop side-by-side columns; in a one-card carousel it's dead space. Fix: `align-items: flex-start` on mobile only. Verified: cards went from all-784px to content-sized (spec-compare 476/500/722; agentic 561–784, `allSame: false`). The *same latent bug* existed in agentic and was fixed there too (it had been masked because its graphs were taller/more uniform).

### spec-compare's hamburger was rendering blank
spec-compare's `App.tsx` never called `window.ArtificerIcons?.observe()`. The vendored `artificer-icons.js` hydrates `<i data-icon>` once on `DOMContentLoaded` — a one-shot pass that misses React-mounted nodes. So bumping `data-icon-size` would have done nothing; the icon never hydrated. Had to add the `observe()` effect *and* a new `icons.d.ts` ambient declaration (else `tsc` fails on `window.ArtificerIcons`). agentic already had both — this was a per-consumer re-derivation of the same SPA-hydration dance.

### The appbar double-inset (#83) spilling 16px — a second-consumer hit
After fixing the carousel overflow, a residual 16px page overflow remained on spec-compare's compare view. `getBoundingClientRect` on every element found the offender: `.theme-toggle` reaching `right: 406` (16px past a 390px viewport). The appbar's flex content (44px hamburger + 198px wordmark "spec-driven development" + 75px theme toggle) intrinsically needed ~382px in a 342px bar. Root cause: spec-compare never had `.app .appbar { padding-inline: 0 }` (Artificer's vendored appbar carries its own 16px inline padding, which double-insets inside `.container--lg`). agentic had fixed this (filed as #83); spec-compare hit it fresh. Adding the override gave back 32px and resolved it.

### Self-inflicted: duplicate rule + wrong-cwd `git add`
- A careless `Edit` re-matched the appbar header block and produced a **duplicate `.appbar__menu-btn`** rule; had to read the region and dedupe.
- `npm run build` was run from inside `site/`, then `git add site/src/styles.css` ran in the same shell — `fatal: pathspec 'site/src/styles.css' did not match any files` (looked for `site/site/src/`), and the commit silently committed nothing ("Everything up-to-date"). Re-ran `git add` from the repo root. (Bash tool resets cwd between calls, which masked it.)

### Measurement-driven debugging was the through-line
Almost every fix was confirmed with a number, not a vibe: `scrollWidth - innerWidth` for page overflow, per-card `getBoundingClientRect().height` for the stretch bug, `cardCenterOffsetFromViewportCenter` for the chevron centering, `getComputedStyle(...).color` vs the resolved `--fg`/`--fg-secondary` values for the brightness. The brightness check also caught that `agent-browser` defaulted to *light* theme — had to force `data-theme="dark"` to judge the glyph the way Cameron sees it.

---

## Opinions Formed

- **Static CSS reasoning is insufficient; instrument the real browser.** The agent reasoned correctly-sounding paragraphs about `minmax`/min-content/overflow and still shipped a page that overflowed by 2066px. The truth came from `eval`. (Earned by shipping a confidently-wrong carousel.)
- **`1fr` is a trap.** A bare `1fr` grid track is `minmax(auto, 1fr)` and won't shrink below content — silently turning one wide child into a full-page horizontal scroll. Use `minmax(0, 1fr)` whenever a track has a potentially-wide child. (Two consumers hit this; it's in both commit messages.)
- **The Artificer responsive/app-shell layer is an "unowned layer."** Multiple consumers (agentic-harnesses, spec-compare) independently re-hand-roll the same mobile scaffolding — app-shell grid, mobile drawer reflow, full-bleed scroller, diagram fit — and hit the same traps. The design system ships nav *primitives* (`.sidenav`/`.tabs`/`.appbar`) but no canonical responsive shell. (This became upstream issue #116.)
- **Every Artificer consumer re-derives the SPA-hydration dance.** The vendored scripts (icons/theme/focus/whimsy) bind once on `DOMContentLoaded` and miss React nodes. Two consumers independently rediscovered the need for `observe()`/`trap()`/`run()`. The system needs a documented SPA-init contract.
- **Ghost icon-button defaults assume toolbar use, not primary controls.** `.btn--ghost.btn--icon` at `--fg-secondary`, 16px, is right *in a row of controls*; pulled out as the sole primary nav trigger on a phone it's under-sized and (the original investigation thought) under-contrasted. But —
- **Full `--fg` is too bright for a nav glyph.** The over-correction (full white) glared. The resting muted `--fg-secondary` at a larger 32px is the sweet spot. So the "ghost is too faint" instinct was half-wrong: size mattered more than contrast.
- **Tap-dots beat chevrons on touch.** Dots jump to any card *and* show position; chevrons are a desktop mouse affordance whose vertical centering is unsolvable-without-jumping in a variable-height carousel. (spec-compare being dots-only and never flagged was the tell.)

---

## Implementation Notes

**Axes: responsive-on-vendored-design-system, SPA-consumption contract, diagram fit, cross-consumer feedback, browser verification.**

### Grid track sizing
```css
/* mobile .app-shell — the bug was a bare 1fr */
.app-shell { grid-template-columns: minmax(0, 1fr); } /* NOT 1fr (= minmax(auto,1fr), won't shrink) */
```

### Full-bleed carousel breakout
```css
@media (max-width: 800px) {
  .compare-scroll { margin-inline: calc(-1 * var(--s-lg)); } /* cancels .container's gutter exactly → flush to viewport, no overflow */
  .compare-grid {
    scroll-snap-type: x mandatory;
    align-items: flex-start;       /* cards size to own diagram, not the tallest */
  }
  .compare-col { flex-basis: 100%; scroll-snap-align: center; }  /* MUST come after the desktop `flex: 0 0 290px` (source-order) */
  .compare-chev { display: none; } /* swipe + dots cover it */
}
```
(In spec-compare the breakout was applied directly to `.compare-grid` since there was no `.compare-scroll` wrapper.)

### Unified nearest-center navigation
```ts
// active = card nearest viewport center (width-agnostic → correct on desktop filmstrip AND mobile carousel)
const center = el.scrollLeft + el.clientWidth / 2
// ... pick child with min |childCenter - center| ...
const scrollToCard = (i) =>
  el.scrollTo({ left: card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2, behavior: 'smooth' })
// dots: scrollToCard(i); chevrons (desktop): scrollToCard(clamp(active + dir)); swipe: native scroll-snap.
// All three settle a card identically.
```

### SPA-consumption contract (the part that bites every consumer)
```ts
// App.tsx — without this, React-mounted `<i data-icon>` render BLANK
useEffect(() => window.ArtificerIcons?.observe(), [])
```
Plus a `site/src/icons.d.ts` ambient declaration of `window.ArtificerIcons` (mirrors the existing `focus.d.ts`/`whimsy.d.ts`), or `tsc` fails.

### Diagram/SVG fit
```css
@media (max-width: 800px) { .graph-pane svg { max-width: 100%; height: auto; } }
/* single-view loop diagrams shrink to fit; the 680px sequence SVG scaled to ~292px */
```
Wide tables (feature matrix, heatmap) were already in `.table-scroll { overflow-x: auto }` and self-fixed once `.app-shell` could shrink.

### Cherry-pick keeping an open PR mergeable
```
git checkout main && git cherry-pick <fix-commit>   # only the mobile fix, not reassess's 9 commits
git merge-tree --write-tree --name-only origin/main origin/reassess/2026-05  # clean tree → no conflict
gh pr view 9 --json mergeable,mergeStateStatus       # MERGEABLE / CLEAN
```

### What I'd do differently starting over
- Verify the *first* carousel in the browser before claiming it worked — the whole "still hanging out to the right" round was avoidable.
- Place mobile overrides after their desktop counterparts by default (source-order discipline), not as an afterthought.
- Check for `ArtificerIcons.observe()` as part of any "consume Artificer in an SPA" checklist, not after the glyph renders blank.

---

## Quotable Moments

Verbatim (Cameron):

> "Oof big dog. I just looked at this site on my phone. The harnesses scrolling to the left and the right doesn't work. It renders the full thing and have to like fully zoom out. Not mobile friendly at all."

> "Also the hamburger menu glyph is .. oof."

> "Diagrams are fine. It's the container that does the L<->R scrolling"

> "I think it's just that the glyph is too small."

> "carousel is still not working right. it's still hanging out wayyy to the right. Help me understand what you're trying to do and what tools. You shouldn't be getting blocked."

> "i still feel like the glyph is too small"

> "It's probably connecting to the wrong chrome instance. and not the one that's local! Can you use agent browser or playwright? Help me help you."

> "let's do 36 size glyph. so i can see 30 vs 36 (or is there's a better logical increment higher than 30)"

> "I feel like a lot of this is stuff that needs to be fixed in artificer-design-system, because ../spec-compare needs a lot of the same fixes too."

> "damn that looks bad."

> "Looks resolved for the most part. Two nitpicks which is artificer to the core:"

> "Behavior is slightly different if you use the chevron/button vs sliding. Sliding is the correct behavior (it 'centers' the diagram)"

> "each diagram has a different length dependent on nodes (make sense), but because of that the chevron buttons aren't centered per each diagram. but i definitely don't want some dramatic movement/placement that recenters it based on the diagram either .."

> "also, I think the hamburger menu glyph is way too bright."

> "i still think the chevron scroll needs to use the same center-on math for non-mobile."

> "I can't find the claude session with reassess.. I'm wondering if we were just waiting on the PR review."

On the carousel feel (full-bleed decision trigger):
> "I feel like the uneven 'whitespace' from the lack of padding/margin on the right side of the carousel is distracting?"

---

## Open Threads

- **reassess/2026-05 (PR #9) doesn't carry the 3 spec-compare mobile commits** — they're only on `main` (cherry-picked). PR stays mergeable and auto-combines on merge, so doing nothing is safe; the only reason to cherry-pick them onto reassess is to keep the active working branch current for local dev. Left as Cameron's call; unanswered at retro time.
- **The upstream Artificer issues are filed, not fixed.** #114 (glyph), #116 (unowned responsive app-shell layer), #83 (appbar inline-padding double-inset). Candidate system changes named but not built: a `.appbar--contained` modifier; a canonical responsive app-shell pattern; a documented SPA-init contract (observe/trap/run); a `menu` glyph whose bars span the full viewBox height so it reads at 16px without a per-consumer size bump.
- **Do other Artificer consumers have the same gaps?** Two confirmed (agentic-harnesses, spec-compare). Unknown whether more exist.
- **agentic-harnesses had 2 pre-existing Dependabot moderates** (surfaced on push) — untouched this session.

---

## Honesty flags

- **Confidence tags are inferred.** Cameron rarely said "settled" or "good enough" outright; I assigned confidence from how decisively he chose and whether he later revisited (e.g., the glyph size is tagged "settled, iterative" because it changed 6 times before sticking). Treat tags as my read, not his stated certainty.
- **Opinions are sharpened.** The "Opinions Formed" section attributes beliefs to "Cameron (or the working process)" — several (e.g., "static CSS reasoning is insufficient," "tap-dots beat chevrons on touch") are conclusions the *session* demonstrated and the agent articulated; Cameron endorsed the directions via his choices but didn't necessarily state each as a maxim. The "1fr is a trap" and "unowned layer" framings are drawn from commit messages and the filed issues, which Cameron approved.
- **Quotes are verbatim** from the conversation, copied not reworded (including original typos like "wayyy" and "there's" in "is there's a better"). Where a quote was long I did not trim mid-sentence; all shown are complete utterances or complete leading clauses.
- **Measurements are from the session's `agent-browser` eval output** (e.g., 2066px overflow, 290px flex-basis, 406px theme-toggle right edge, `#c5c8c6` vs `#e8e6e1`, 0px chevron center offset, card heights). They are real tool outputs, not reconstructed.
- **The `--fg`/`--fg-secondary` hex values** (`#e8e6e1` / `#c5c8c6`) are the dark-theme resolved values read in this session; light-theme values differ (the agent-browser default render showed `rgb(74,63,42)` for `--fg-secondary` in light theme).
