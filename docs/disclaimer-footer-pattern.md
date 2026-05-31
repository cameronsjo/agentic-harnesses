# The honest-footer pattern — disclaimer, attribution, disclosure, layout

> A focused handoff prompt for adding a credible footer to a project that
> **represents or reconstructs things it doesn't own** (other people's tools,
> APIs, products). Covers the *content tiers* and the *layout* we settled on in
> the `agentic-harnesses` build. Paste this to a fresh session when you need to
> add or review a project's disclaimer/attribution footer.

## When you need this

Any site that depicts third-party software, reverse-engineers behavior, or makes
comparative claims should carry an honest footer. Three jobs:
1. **Set expectations** — this is unofficial, it's a reconstruction, it can be wrong.
2. **Give credit** — what it's built with.
3. **Come clean** — your biases and conflicts, and a way to correct you.

Skipping this reads as either a claim of authority you don't have or a hidden
agenda. A plain footer buys credibility cheaply.

## The four content tiers (in priority order)

1. **Provenance / independence.** State up front it's independent and unofficial,
   and *how* the content was derived. If it's reconstructed from source, say so,
   say it's pinned to a commit, and say it can be incomplete, simplified, or out
   of date. Don't imply more certainty than you have. If different subjects have
   different provenance (e.g. one is from a leaked snapshot vs. public repos),
   distinguish them.
2. **Attribution.** What it's built *with* — tools, libraries, design system.
   Short. This is also where "built with $TOOL" honesty starts shading into the
   next tier.
3. **Disclosure (bias).** Name your preference instead of pretending neutrality.
   "Written by — and with — a genuine $X partisan; the content still aims to treat
   every subject on equal terms." Disclosing the bias is *more* credible than
   claiming you have none. Pair it with a correction channel ("spot a bias or an
   error? open an issue").
4. **Legal / affiliation fine print.** No affiliation, sponsorship, or
   endorsement. Disclose specific conflicts precisely but minimally. Trademarks
   belong to their owners.

## Wording principles

- **Plain and direct**, lightly wry — not legalese, not a victory lap.
- **Disclose bias; don't launder it.** Saying you're partial is the honest move.
- **Name conflicts at the right resolution.** We wrote *"the author works at the
  same company as $PROJECT's maintainer but does not work on $PROJECT, and has no
  other ties."* That names the relationship and its boundary **without** naming
  the company or the person — enough to be honest, not so much that it overshares
  or drags in third parties. Calibrate to the smallest true statement that
  removes the appearance of a hidden interest.
- **Invite correction.** A visible "open an issue" link converts "trust me" into
  "check me."
- **Get explicit sign-off on the bias line and any conflict line** before
  shipping — these are statements about a *person*, not the product.

## Layout pattern

The failure mode is a single tall column of prose down one edge (a "wall of
text"). The fix is structural, not editorial:

- **Two-column grid** for the substantive tiers (provenance | attribution+disclosure),
  side-by-side so the footer uses full width instead of stacking.
- **Full-width fine-print tier** below the grid for the legal/affiliation line —
  it must **span both columns**, not inherit the column measure (that traps it
  under one column).
- **Small uppercase section labels** ("Reconstructed", "Disclosure") in the accent
  color so it scans as a designed footer, not reflowed text.
- **Recessive fine print** — smaller, lower opacity than the body tiers.
- **Cap the column measure** (~70ch) for readability; the fine-print line gets
  `max-width: none` so it runs full width.
- **Collapse to one column** at the mobile breakpoint.

### Reference structure (Artificer tokens)

```tsx
<footer className="app-footer stack stack--sm">
  <div className="footer-grid">                {/* grid-template-columns: 1fr 1fr */}
    <section className="footer-col stack stack--xs">
      <span className="footer-label">Reconstructed</span>
      <p>{/* provenance / independence */}</p>
    </section>
    <section className="footer-col stack stack--xs">
      <span className="footer-label">Disclosure</span>
      <p>{/* attribution + bias + "open an issue" */}</p>
    </section>
  </div>
  <p className="footer-fine">{/* legal / affiliation — full width */}</p>
</footer>
```

```css
.footer-grid   { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-xl); align-items: start; }
.app-footer p  { margin: 0; line-height: 1.5; }
.footer-grid p { max-width: 70ch; }   /* cap the measure ONLY in the columns */
.footer-label  { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; color: var(--accent); }
.footer-fine   { opacity: 0.8; }       /* a direct footer child, outside the grid → never capped → full width */
@media (max-width: 800px) { .footer-grid { grid-template-columns: 1fr; gap: var(--s-md); } }
```

> **Specificity gotcha:** do *not* cap the measure with `.app-footer p { max-width: 70ch }`
> and then try to release it with `.footer-fine { max-width: none }` — element+class
> `(0,1,1)` outranks the bare class `(0,1,0)`, so the fine print stays pinned to one
> column. Scope the cap to `.footer-grid p` instead, so it never touches the fine-print line.

### Artificer caveat

The footer is a **prose island in a tool surface**. `.surface-tool *` forces
`--font-mono` on every descendant, so the disclaimer renders monospace and a
section-scoped `--font-sans` won't win at equal specificity. Options: accept mono
(on-brand, fine), use a deeper selector, or pull the footer outside the
`.surface-tool` wrapper. Artificer ships no footer/colophon primitive, so this
structure is bespoke. (See `cameronsjo/artificer-design-system#97`.)

## Example copy (adapt, don't copy verbatim)

- **Provenance:** "Independent & unofficial. Every $SUBJECT here is a
  reconstruction. The public ones cite `file:line` at a pinned SHA; $SPECIAL_CASE
  is pieced together from a recovered snapshot. Reconstructions can be incomplete,
  simplified, or out of date, and may not match current behavior."
- **Disclosure:** "Built with $TOOLS, on $DESIGN_SYSTEM. In the interest of full
  disclosure: this was written by — and with — a genuine $TOOL partisan. The
  $CONTENT still aims to treat every $SUBJECT on equal terms. Spot a bias or an
  error? Open an issue."
- **Fine print:** "No affiliation with, sponsorship by, or endorsement from any
  project shown. The author works at the same company as $PROJECT's maintainer
  but does not work on $PROJECT, and has no other ties to the $SUBJECTS here.
  Project names and marks belong to their respective owners."
