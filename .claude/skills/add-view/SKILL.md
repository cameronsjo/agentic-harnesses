---
name: add-view
description: Use when adding a new visualizer view to the site/ SPA (a new tab like Compare, Sequence, Wire, or Hooks). Covers the data-spec-first pattern, the shared controls/timer/graph infrastructure to reuse, and wiring into the nav.
---

# Add a Visualizer View

Add a new tab to the `site/` app. The rule that keeps this repo honest: **a view renders a JSON spec, it does not hardcode data.** If your view shows facts about a harness, those facts live in a JSON file under `site/src/data/`, the same way loop specs, wire specs, and hook specs do.

**Announce at start:** "Using add-view to add the `<name>` view."

## Reuse before you build

This is the heart of the skill. The infrastructure already exists — a new view should be mostly composition. **Grep these before writing anything new:**

| Need | Use | From |
|---|---|---|
| Step/play/pause/reset state + timed advance | `usePlayerTimer(length, resetKey?)` | `site/src/player.ts` |
| Reset / Play·Pause·Replay / Step buttons + counter | `<TransportBar player={...} playLabel counterLabel total />` | `site/src/controls.tsx` |
| A row of pill tabs (harness / scenario / mode picker) | `<TabPicker items active onSelect ariaLabel className? />` | `site/src/controls.tsx` |
| Node/edge graph of a loop spec | `<LoopGraph spec activeNodeId activeEdge badges? onNodeClick? />` | `site/src/LoopGraph.tsx` |
| Enlarge a diagram to a modal | `<ExpandButton onClick />` in the `.graph-pane`, paired with `<GraphModal open onClose title diagram side />` (it owns the two-column `diagram \| side` shell) | `site/src/controls.tsx`, `site/src/GraphModal.tsx` |
| Active-edge helper for a step transition | `edgeBetween(fromId, toId)` | `site/src/player.ts` |
| The loaded specs / lookup / shared scenarios | `specs`, `specByHarness`, `scenario`, `sharedScenarios` | `site/src/data.ts` |

If you find yourself re-implementing a transport bar, a tab row, or a timer, stop — that's the bug. Those were deduplicated into shared modules on purpose; adding a sixth copy regresses it.

## Step 1 — Back the view with a data spec

Put the view's data in `site/src/data/<family>/<harness-or-topic>.json` (mirror `data/wire/`, `data/hooks/`). Import it in the component with a typed assertion, the same pattern the existing views use. Hardcoding the data inline is the one thing that breaks the "single source of truth" guarantee this project sells.

If the view is a new *projection* of existing loop specs (like Sequence is), write a pure projector in a `.ts` module (see `sequence.ts` → `projectScenario`) instead of a data file — it derives from the loop spec, so it can't drift either.

## Step 2 — Build the component

Create `site/src/<Name>View.tsx`. Conventions to honor:

- **Theme via tokens only.** Colors, spacing, radii, motion come from Artificer CSS variables (`var(--accent-bright)`, `var(--s-md)`, etc.). No hardcoded hex, no bespoke durations. The visualizer is dark-first.
- **Layout via utilities.** Use `cluster` / `stack` / existing classes, not hand-rolled flexbox.
- **A11y.** Tab groups get `role="group"` + `aria-label` (TabPicker does this for you). Interactive SVG nodes need `tabIndex`/`role="button"`/keyboard handlers — copy LoopGraph's pattern.
- **SVG marker IDs must be per-instance.** `url(#id)` resolves document-scope, so two diagrams on one page collide. Namespace markers by harness/scenario (e.g. `seq-arrow-${harness}-${scenarioId}`) — LoopGraph and SequenceView both do this.
- **Own your timer where it's used.** If only a sub-mode steps through, call `usePlayerTimer` inside the sub-component so it mounts/unmounts with that mode (this is why WireView's timer lives in `LayersView`, not the parent — it avoids stale state across mode switches).

## Step 3 — Wire into the tabs

In `site/src/App.tsx`:
1. Add the tab key to the `ViewTab` union type.
2. Add a tab to the computed `availableTabs` array — either globally (always shown) or conditionally under `harness === 'claude-code'` if it's CC-specific (like Wire/Hooks).
3. Add a branch to the render switch that mounts `<NameView />`.

Decide whether the Legend shows for your view (the `view !== 'wire'` guard controls this today).

## Step 4 — Style

Add any new classes to `site/src/styles.css`, using Artificer tokens. Keep them adjacent to the related view's styles.

## Step 5 — Verify

```bash
cd site && npm run build   # validate + tsc + vite — must exit 0
npm run dev                # click the new tab; step through it; toggle light/dark
```

Confirm: the new tab renders, the transport controls drive it, light/dark both look right (the `ThemeToggle` drives `data-theme`), and nothing else regressed.

## Anti-patterns

- **Re-implementing the transport bar / tab row / timer / expand button.** Reuse `controls.tsx` (`TransportBar`, `TabPicker`, `ExpandButton`) + `player.ts`.
- **Hand-building the expand-modal layout.** `GraphModal` owns the `diagram | side` shell — pass the two fragments as props, don't re-type `.graph-modal__layout`.
- **Hardcoding harness facts in the component.** Back it with a JSON spec or a pure projector.
- **Static SVG marker ids.** Namespace per instance or diagrams collide.
- **Raw hex / bespoke spacing / one-off durations.** Use Artificer tokens.
- **A parent-owned timer for a mode-switched sub-view.** Own the timer in the sub-view so it resets on switch.
