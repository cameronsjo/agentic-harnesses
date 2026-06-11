/**
 * The standalone Disclosure page (route `#disclosure`): the attribution +
 * partisan-bias statement (the old footer's "Disclosure" tier) plus the legal
 * fine print (no affiliation, the Code Puppy conflict note, trademark ownership).
 * Reached from the footer; rendered in <main> in place of the harness chrome
 * (App.tsx useRoute). Prose uses the `.t-*` type classes to read as sans on the
 * .surface-tool mono surface.
 */
export function DisclosureView() {
  return (
    <article className="prose-page stack stack--lg" aria-labelledby="disclosure-title">
      <header className="stack stack--xs">
        <h1 id="disclosure-title" className="t-headline-lg">
          Disclosure
        </h1>
        <p className="t-body-lg">
          <b className="anchor">Independent &amp; unofficial.</b> Every harness here is a
          reconstruction — incomplete, simplified, or out of date is possible, and it may not match
          current behavior.
        </p>
      </header>

      <section className="stack stack--xs">
        <h2 className="t-headline-md">Built with</h2>
        <p className="t-body-md">
          Built with <b className="anchor">Claude</b> and <b className="anchor">Claude&nbsp;Code</b>
          , on the{' '}
          <a
            className="anchor"
            href="https://cameronsjo.github.io/artificer/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Artificer design system
          </a>{' '}
          (consumed from the <code>@cameronsjo/artificer</code> npm package).
        </p>
      </section>

      <section className="stack stack--xs">
        <h2 className="t-headline-md">Bias</h2>
        <p className="t-body-md">
          In the interest of full disclosure: this was written by — and with — a genuine
          Claude&nbsp;Code partisan. The diagrams still aim to treat every harness on equal terms.
          Spot a bias or an error?{' '}
          <a className="anchor" href="https://github.com/cameronsjo/agentic-harnesses/issues">
            Open an issue
          </a>
          .
        </p>
      </section>

      <section className="stack stack--xs">
        <h2 className="t-headline-md">Affiliations &amp; marks</h2>
        <p className="t-body-md">
          No affiliation with, sponsorship by, or endorsement from any project shown. The author
          works at the same company as Code&nbsp;Puppy’s maintainer but does not work on
          Code&nbsp;Puppy, and has no other ties to the harnesses here. Project names and marks
          belong to their respective owners.
        </p>
      </section>

      <footer className="stack stack--xs">
        <p className="t-body-md">
          See also the{' '}
          <a className="anchor" href="#about">
            About
          </a>{' '}
          page. <a className="anchor" href="#main">Back to the harnesses ›</a>
        </p>
      </footer>
    </article>
  )
}
