import { useEffect, useRef, useState } from 'react'
import { specs } from './data'
import { KIND_COLOR, KIND_LABEL, type NodeKind } from './types'
import { ScenarioCompare } from './ScenarioCompare'
import { LoopPlayer } from './LoopPlayer'
import { HooksView } from './HooksView'
import { WireView } from './WireView'
import { SequenceView } from './SequenceView'

type View = 'compare' | 'single' | 'sequence' | 'hooks' | 'wire'

const KINDS: NodeKind[] = ['input', 'llm', 'tool', 'approval', 'execute', 'decision', 'terminal']

export function App() {
  const [view, setView] = useState<View>('compare')
  const [harness, setHarness] = useState(specs[0]?.harness ?? '')
  const [scenarioId, setScenarioId] = useState('edit-file')

  const spec = specs.find((s) => s.harness === harness) ?? specs[0]

  // The one persistent whimsy moment: the wordmark breathes the ultrathink
  // shimmer (spectrum) for three hue-cycles on load, then drifts glacially.
  // React mounts after DOMContentLoaded, so the ref-driven run() is the hook.
  const titleRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const cancel = window.Whimsy?.run(titleRef.current, { loops: 3, settle: 'glacial' })
    return () => cancel?.()
  }, [])

  return (
    <div className="app container container--lg surface-tool">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="masthead stack stack--sm">
        <div className="masthead-top">
          <h1 className="masthead-title t-headline-md">
            <span className="whimsy" ref={titleRef}>
              agentic harness loops
            </span>
          </h1>
          <ThemeToggle />
        </div>
        <p className="lede t-body-lg">
          Four coding agents, one <b className="anchor">loop</b> apiece. See how each harness{' '}
          <b className="anchor">runs a turn</b>, <b className="anchor">dispatches tools</b>, and{' '}
          <b className="anchor">gates the dangerous ones</b> — all{' '}
          <b className="anchor">reconstructed from pinned source</b>.
        </p>
        <div className="masthead-meta cluster" aria-label="About this build">
          <span className="badge badge--ghost">v1</span>
          <span className="badge badge--ghost">{specs.length} harnesses</span>
          <span className="badge badge--ghost">source-pinned</span>
          <span className="badge badge--ghost">WCAG AAA</span>
        </div>
      </header>

      <main id="main" className="stack stack--lg">
      <nav className="view-nav cluster" role="group" aria-label="View">
        <button
          type="button"
          aria-pressed={view === 'compare'}
          className={`btn btn--ghost tab ${view === 'compare' ? 'tab--active' : ''}`}
          onClick={() => setView('compare')}
        >
          Compare all
        </button>
        <button
          type="button"
          aria-pressed={view === 'single'}
          className={`btn btn--ghost tab ${view === 'single' ? 'tab--active' : ''}`}
          onClick={() => setView('single')}
        >
          Single harness
        </button>
        <button
          type="button"
          aria-pressed={view === 'sequence'}
          className={`btn btn--ghost tab ${view === 'sequence' ? 'tab--active' : ''}`}
          onClick={() => setView('sequence')}
        >
          Sequence
        </button>
        <span className="nav-sep">Claude Code</span>
        <button
          type="button"
          aria-pressed={view === 'hooks'}
          className={`btn btn--ghost tab ${view === 'hooks' ? 'tab--active' : ''}`}
          onClick={() => setView('hooks')}
        >
          Hooks &amp; events
        </button>
        <button
          type="button"
          aria-pressed={view === 'wire'}
          className={`btn btn--ghost tab ${view === 'wire' ? 'tab--active' : ''}`}
          onClick={() => setView('wire')}
        >
          Across the wire
        </button>
      </nav>

      {view !== 'wire' && <Legend />}

      {specs.length === 0 ? (
        <p className="empty">
          <b className="anchor">No loop specs found.</b> Add files under <code>src/data/loops/</code>.
        </p>
      ) : view === 'hooks' ? (
        <HooksView />
      ) : view === 'wire' ? (
        <WireView />
      ) : view === 'sequence' ? (
        <SequenceView />
      ) : view === 'compare' ? (
        <ScenarioCompare />
      ) : (
        <section className="single">
          <div className="harness-pick cluster" role="group" aria-label="Harness">
            {specs.map((s) => (
              <button
                key={s.harness}
                type="button"
                aria-pressed={s.harness === spec.harness}
                className={`btn btn--ghost tab ${s.harness === spec.harness ? 'tab--active' : ''}`}
                onClick={() => setHarness(s.harness)}
              >
                {s.displayName}
              </button>
            ))}
          </div>
          <div className="harness-meta">
            <span className="lang-badge">{spec.language}</span>
            <span className="loop-style">{spec.loopStyle}</span>
            {spec.repo && (
              <a className="repo-link" href={spec.repo} target="_blank" rel="noreferrer">
                {spec.repo.replace('https://github.com/', '')}
              </a>
            )}
          </div>
          <LoopPlayer spec={spec} scenarioId={scenarioId} onScenarioChange={setScenarioId} />
        </section>
      )}

      </main>

      <footer className="app-footer">
        Live repos (OpenCode · pi · code_puppy) <b className="anchor">cite <code>file:line</code></b> at{' '}
        <b className="anchor">pinned SHAs</b>. Claude Code is from a{' '}
        <b className="anchor">leaked/recovered snapshot</b> — file-level refs, <b className="anchor">leak + speculation</b>.
        Built with the <b className="anchor">Artificer design system</b>.
      </footer>
    </div>
  )
}

const THEME_KEY = 'artificer.theme'

function readTheme(): 'light' | 'dark' {
  const attr = document.documentElement.getAttribute('data-theme')
  if (attr === 'light' || attr === 'dark') return attr
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

/**
 * Owns the theme toggle in React. The vendored artificer-theme.js binds on
 * DOMContentLoaded — before this SPA mounts — so its click handler never
 * attaches. We drive the same `data-theme` attribute + `artificer.theme` key here.
 */
function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(readTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // localStorage unavailable (private mode etc.) — theme still applies for the session.
    }
  }, [theme])

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label="Toggle light or dark theme"
      onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
    >
      <span className="dot" />
      <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
    </button>
  )
}

function Legend() {
  return (
    <div className="legend cluster" aria-label="Node kinds">
      {KINDS.map((k) => (
        <span key={k} className="legend-item">
          <span className="dot" style={{ background: KIND_COLOR[k] }} />
          <span className="t-label-sm">{KIND_LABEL[k]}</span>
        </span>
      ))}
    </div>
  )
}
