/**
 * The standalone About page (route `#about`): provenance + methodology prose,
 * seeded from docs/methodology.md. Reached from the footer; rendered in <main>
 * in place of the harness chrome (App.tsx useRoute). Prose escapes the
 * .surface-tool mono trap via the `.t-*` type classes (sans even on a tool
 * surface — see docs/artificer-spa-consumer-brief.md).
 */
const METHODOLOGY_URL =
  'https://github.com/cameronsjo/agentic-harnesses/blob/main/docs/methodology.md'

export function AboutView() {
  return (
    <article className="prose-page stack stack--lg" aria-labelledby="about-title">
      <header className="stack stack--xs">
        <h1 id="about-title" className="t-headline-lg">
          About
        </h1>
        <p className="t-body-lg">
          An independent, unofficial reference for how coding-agent harnesses run their loops —
          each one’s turn loop, tool dispatch, and approval gate reconstructed from source and
          rendered as steppable diagrams.
        </p>
      </header>

      <section className="stack stack--xs">
        <h2 className="t-headline-md">Grounded in source, not marketing</h2>
        <p className="t-body-md">
          Every claim about a harness’s loop is grounded in its source code. Each node in a loop
          spec (<code>site/src/data/loops/&lt;harness&gt;.json</code>) carries a{' '}
          <code>sourceRef</code>, and the prose profiles follow the same discipline. The
          open-source harnesses are pinned to exact commit SHAs — their refs are{' '}
          <code>path:line</code> and reproducible: check out the SHA and the line is there.
        </p>
      </section>

      <section className="stack stack--xs">
        <h2 className="t-headline-md">Claude Code is the exception</h2>
        <p className="t-body-md">
          Claude Code is studied from a <b className="anchor">leaked / recovered</b> source
          snapshot (a source-map reconstruction of a published build) that is already somewhat
          old. Its refs are deliberately <b className="anchor">file-level only</b> — no line
          numbers — and its internals should be read as “based on the leak + informed
          speculation”: indicative of how the shipped CLI behaves, not an authoritative or current
          account. Anthropic has not published this source; treat specifics as best-effort
          reconstruction.
        </p>
      </section>

      <section className="stack stack--xs">
        <h2 className="t-headline-md">What gets onboarded</h2>
        <p className="t-body-md">
          The bar is concrete: there must be a real <b className="anchor">model → tool dispatch →
          loop</b> to reconstruct. A project with no turn loop, no tool dispatch, and no approval
          gate can’t be profiled without inventing nodes — and inventing structure is exactly the
          anti-pattern this repo exists to avoid. Provider routers and delegating gateways are
          documented as deliberate exclusions rather than given a manufactured spec.
        </p>
      </section>

      <footer className="stack stack--xs">
        <p className="t-body-md">
          The full method — pinned revisions, what was read in each codebase, and the caveats —
          lives in{' '}
          <a className="anchor" href={METHODOLOGY_URL} target="_blank" rel="noopener noreferrer">
            docs/methodology.md
          </a>
          . See also the{' '}
          <a className="anchor" href="#disclosure">
            Disclosure
          </a>{' '}
          page. <a className="anchor" href="#main">Back to the harnesses ›</a>
        </p>
      </footer>
    </article>
  )
}
