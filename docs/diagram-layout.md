# Loop-graph layout — making the polished look land

The loop diagrams (`site/src/LoopGraph.tsx`) are a vertical column of node boxes
with curved edges. Three layout rules give them the readable, balanced look. If
a new harness's diagram looks cramped, lopsided, or "zoomed out", it's almost
always one of these slipping.

## 1. Node-centered framing

A diagram has two side gutters: **right** holds forward non-adjacent arcs, **left**
holds backward arcs. They're rarely equal — a harness with three back-edges and
one forward-edge has a fat left gutter and a thin right one.

Sizing the viewBox as `leftPad + NODE_W + rightPad` (the naïve sum) leaves the
node column off-center, so once the SVG is centered in its container the *boxes*
look shifted. Instead the frame is **symmetric about the node center**: pad both
sides to the wider gutter (`sideMax = max(leftPad, rightPad)`), then

```text
viewMinX = leftPad - sideMax   // ≤ 0
width    = NODE_W + 2 * sideMax
```

The node column lands dead-center; the lighter side just gains empty gutter. Arc
geometry is untouched — only the frame moves.

## 2. Lanes ordered by span (arcs nest, not cross)

When several arcs share a side they fan into lanes (`LANE_BASE` + `LANE_STEP` per
lane). Assign lanes by **row-span, shortest first**: the short arc hugs the nodes
(inner lane), the long arc rides the outer lane. They then nest concentrically.

Assigning by edge-declaration order instead lets a long arc land inner and cut
across the short arcs stacked outside it — the crowding/tangled-labels look on
denser graphs. Sort is stable, so equal spans keep declaration order.

## 3. Gutters sized to the arc *apex*, not the control distance

This is the "zoomed out" lever. A same-side arc is a cubic with both control
points at `ctrlX`, so its horizontal apex (t=0.5) reaches only **~0.75·ctrlDist**
beyond the node edge — not the full control distance. Sizing the gutter to the
full `ctrlDist` over-reserves ~25% of every gutter; doubled by symmetric framing
(rule 1), that's what scales the whole diagram down in the compare grid.

So the gutter is `round(APEX_FRAC · ctrlDist_outer) + LABEL_ROOM` (`APEX_FRAC =
0.75`), where `LABEL_ROOM` is the space past the apex for the label to sit. Tune
`LABEL_ROOM` / `MIN_SIDE` for margin, **not** `LANE_BASE` / `LANE_STEP` — those
control arc fan spacing (readability), and shrinking them re-crowds the arcs.

## Verifying

Run `npm run dev` and check both contexts:

- **Compare grid** — every column's boxes are horizontally centered and the set
  reads at a comfortable size (not shrunk by one fat-guttered outlier).
- **Loop tab** — the single diagram is centered with arcs nested by length and
  labels clear of the boxes.

The densest specs (10 nodes / 12–13 edges: `opencode`, `code-puppy`, `claw-code`,
`hermes`) are the stress test — if they're legible, the lighter ones are fine.
