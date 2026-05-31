import { useEffect, useRef, useState } from 'react'
import { specs } from './data'
import { KIND_COLOR, KIND_LABEL, type NodeKind } from './types'
import { ScenarioCompare } from './ScenarioCompare'
import { LoopPlayer } from './LoopPlayer'
import { HooksView } from './HooksView'
import { WireView } from './WireView'
import { SequenceView } from './SequenceView'

// The view within a selected harness. Compare-all (harness === null) has no tabs —
// the surface *is* the grid.
type ViewTab = 'loop' | 'sequence' | 'hooks' | 'wire'

const TAB_LABELS: Record<ViewTab, string> = {
  loop: 'Loop',
  sequence: 'Sequence',
  hooks: 'Hooks & events',
  wire: 'Across the wire',
}

const KINDS: NodeKind[] = ['input', 'llm', 'tool', 'approval', 'execute', 'decision', 'terminal']

// Tabs available for a given harness. Hooks/Wire are Claude-Code-pinned deep-dives,
// not per-harness capabilities — they ride along only when claude-code is selected.
function tabsFor(harness: string | null): ViewTab[] {
  if (harness === null) return []
  return ['loop', 'sequence', ...(harness === 'claude-code' ? (['hooks', 'wire'] as ViewTab[]) : [])]
}

export function App() {
  // Single source of truth. harness === null is the "Compare all" surface.
  const [harness, setHarness] = useState<string | null>(null)
  const [tab, setTab] = useState<ViewTab>('loop')
  const [scenarioId, setScenarioId] = useState('edit-file') // lifted — persists across switches
  const [navOpen, setNavOpen] = useState(false) // mobile drawer

  const availableTabs = tabsFor(harness)
  const spec = harness ? specs.find((s) => s.harness === harness) : undefined

  // Clamp the tab back to Loop when switching to a harness that lacks the current tab
  // (e.g. leaving claude-code while on Hooks/Wire). Only fires on harness change.
  useEffect(() => {
    if (harness === null) return
    if (!tabsFor(harness).includes(tab)) setTab('loop')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [harness])

  const selectHarness = (h: string | null) => {
    setHarness(h)
    setNavOpen(false)
  }

  // The one persistent whimsy moment: the wordmark breathes the ultrathink
  // shimmer (spectrum) for three hue-cycles on load, then drifts glacially.
  // React mounts after DOMContentLoaded, so the ref-driven run() is the hook.
  const titleRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const cancel = window.Whimsy?.run(titleRef.current, { loops: 3, settle: 'glacial' })
    return () => cancel?.()
  }, [])

  // Mobile drawer focus management. The drawer is always in the DOM (CSS slides it
  // off-canvas), so when closed we mark it `inert` to keep its buttons out of the tab
  // order — otherwise desktop, where the hamburger is hidden, gains phantom nav stops.
  // When open we trap focus (Esc / scrim close it; release restores focus to the
  // hamburger). Graceful no-op if the vendored helper is absent.
  const drawerRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = drawerRef.current
    if (!el) return
    if (!navOpen) {
      el.setAttribute('inert', '')
      return
    }
    el.removeAttribute('inert')
    const handle = window.ArtificerFocus?.trap(el, { onEscape: () => setNavOpen(false) })
    return () => handle?.release()
  }, [navOpen])

  // Legend belongs to graph contexts; the wire view draws its own request anatomy.
  const showLegend = !(harness !== null && tab === 'wire')

  return (
    <div className="app container container--lg surface-tool" data-nav-open={navOpen ? '' : undefined}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="appbar">
        <button
          type="button"
          className="btn btn--ghost btn--icon appbar__menu-btn"
          aria-label="Open navigation"
          aria-expanded={navOpen}
          aria-controls="nav-drawer"
          onClick={() => setNavOpen(true)}
        >
          <i data-icon="menu" />
        </button>
        <a className="appbar__brand wordmark" href="#main">
          <span className="whimsy" ref={titleRef}>
            agentic harness loops
          </span>
        </a>
        <span className="appbar__spacer" />
        <div className="appbar__actions">
          <ThemeToggle />
        </div>
      </header>

      <section className="intro stack stack--sm">
        <p className="lede t-body-lg">
          Coding agents, one <b className="anchor">loop</b> apiece. See how each harness{' '}
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
      </section>

      <div className="app-shell">
        <aside className="app-sidenav">
          <HarnessNav harness={harness} onSelect={selectHarness} />
        </aside>

        <main id="main" className="stack stack--lg">
          {availableTabs.length > 0 && (
            <div className="tabs" role="tablist" aria-label="View">
              {availableTabs.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                >
                  {TAB_LABELS[t]}
                </button>
              ))}
            </div>
          )}

          {showLegend && <Legend />}

          {specs.length === 0 ? (
            <p className="empty">
              <b className="anchor">No loop specs found.</b> Add files under{' '}
              <code>src/data/loops/</code>.
            </p>
          ) : harness === null ? (
            <ScenarioCompare scenarioId={scenarioId} onScenarioChange={setScenarioId} />
          ) : !spec ? (
            <p className="empty">
              <b className="anchor">Harness not found.</b>
            </p>
          ) : tab === 'hooks' ? (
            <HooksView />
          ) : tab === 'wire' ? (
            <WireView />
          ) : tab === 'sequence' ? (
            <SequenceView spec={spec} scenarioId={scenarioId} onScenarioChange={setScenarioId} />
          ) : (
            <>
              {/* Harness-level metadata for the Loop view — the sidenav owns
                  selection now, so this is just the badges + source-pinned repo link. */}
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
            </>
          )}
        </main>
      </div>

      {/* Mobile drawer: scrim + off-canvas sidenav. data-nav-open on .app drives both. */}
      <div className="nav-scrim" onClick={() => setNavOpen(false)} />
      <aside id="nav-drawer" className="nav-drawer" aria-hidden={!navOpen} ref={drawerRef}>
        <HarnessNav harness={harness} onSelect={selectHarness} />
      </aside>

      <footer className="app-footer">
        Live repos (OpenCode · pi · code_puppy) <b className="anchor">cite <code>file:line</code></b> at{' '}
        <b className="anchor">pinned SHAs</b>. Claude Code is from a{' '}
        <b className="anchor">leaked/recovered snapshot</b> — file-level refs, <b className="anchor">leak + speculation</b>.
        Built with the <b className="anchor">Artificer design system</b>.
      </footer>
    </div>
  )
}

/**
 * The between-surface spine: "Compare all" plus one item per harness. These switch
 * app state rather than navigate, so they're <button>s — Artificer styles only
 * `.sidenav a`, so styles.css carries a matching `.sidenav button` shim. Rendered
 * twice (persistent aside + mobile drawer) from the same source of truth.
 */
function HarnessNav({
  harness,
  onSelect,
}: {
  harness: string | null
  onSelect: (h: string | null) => void
}) {
  return (
    <nav className="sidenav" aria-label="Harnesses">
      <div className="sidenav__group">Overview</div>
      <button
        type="button"
        aria-current={harness === null ? 'page' : undefined}
        onClick={() => onSelect(null)}
      >
        <span className="label">Compare all</span>
      </button>

      <div className="sidenav__group">Harnesses</div>
      {specs.map((s) => (
        <button
          key={s.harness}
          type="button"
          aria-current={harness === s.harness ? 'page' : undefined}
          onClick={() => onSelect(s.harness)}
        >
          <span className="label">{s.displayName}</span>
        </button>
      ))}
    </nav>
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
