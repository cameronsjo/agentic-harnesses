import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
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

  // Derive the active view rather than clamping `tab` via an effect: if the
  // selected harness lacks the current tab (e.g. you left claude-code while on
  // Wire), fall back to Loop for this render. No one-frame flash of the wrong
  // view, no effect/eslint-suppression, and `tab` still remembers your pick if
  // you return to a harness that has it.
  const activeTab: ViewTab = availableTabs.includes(tab) ? tab : 'loop'

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
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  // useLayoutEffect (not useEffect) so `inert` lands before the browser paints —
  // otherwise the drawer is briefly live in the tab order on first render. `inert`
  // is the single authority for both keyboard tab-order and the a11y tree, so the
  // markup carries no separate aria-hidden that could drift out of sync with it.
  useLayoutEffect(() => {
    const el = drawerRef.current
    if (!el) return
    if (!navOpen) {
      el.setAttribute('inert', '')
      return
    }
    el.removeAttribute('inert')
    const handle = window.ArtificerFocus?.trap(el, { onEscape: () => setNavOpen(false) })
    // On close, return focus to the hamburger regardless of how the drawer was
    // dismissed — the trap's own restore targets whatever was focused at open
    // time, which a scrim click (focus moves to body/scrim) leaves wrong.
    return () => {
      handle?.release()
      menuBtnRef.current?.focus()
    }
  }, [navOpen])

  // Legend belongs to graph contexts; the wire view draws its own request anatomy.
  const showLegend = harness === null || activeTab !== 'wire'

  // Roving-tabindex arrow nav for the view tablist (WAI-ARIA tabs, automatic
  // activation): ←/→ cycle, Home/End jump to the ends, and focus follows selection.
  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    let next: number
    const cur = availableTabs.indexOf(activeTab)
    if (e.key === 'ArrowRight') next = (cur + 1) % availableTabs.length
    else if (e.key === 'ArrowLeft') next = (cur - 1 + availableTabs.length) % availableTabs.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = availableTabs.length - 1
    else return
    e.preventDefault()
    setTab(availableTabs[next])
    const btns = e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    btns?.[next]?.focus()
  }

  return (
    <div className="app container container--lg surface-tool" data-nav-open={navOpen ? '' : undefined}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="appbar">
        <button
          type="button"
          ref={menuBtnRef}
          className="btn btn--ghost btn--icon appbar__menu-btn"
          aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={navOpen}
          aria-controls="nav-drawer"
          onClick={() => setNavOpen(true)}
        >
          <i data-icon="menu" />
        </button>
        <a className="appbar__brand" href="#main">
          {/* .wordmark (and its ::after accent period) rides the inline span, not
              the flex .appbar__brand — otherwise the period becomes a flex child
              and the container's gap pushes it off as "harness ·." */}
          <span className="whimsy wordmark" ref={titleRef}>
            agentic harnesses
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
                  id={`tab-${t}`}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === t}
                  aria-controls="view-panel"
                  tabIndex={activeTab === t ? 0 : -1}
                  onClick={() => setTab(t)}
                  onKeyDown={onTabKeyDown}
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
          ) : (
            // A harness is selected → the content region IS the active tab's panel.
            // tabpanel needs no tabIndex: its views already contain focusable controls.
            <div
              id="view-panel"
              role="tabpanel"
              aria-labelledby={`tab-${activeTab}`}
              className="stack stack--lg"
            >
              {!spec ? (
                <p className="empty">
                  <b className="anchor">Harness not found.</b>
                </p>
              ) : activeTab === 'hooks' ? (
                <HooksView />
              ) : activeTab === 'wire' ? (
                <WireView />
              ) : activeTab === 'sequence' ? (
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
            </div>
          )}
        </main>
      </div>

      {/* Mobile drawer: scrim + off-canvas sidenav. data-nav-open on .app drives both. */}
      <div className="nav-scrim" onClick={() => setNavOpen(false)} />
      <aside id="nav-drawer" className="nav-drawer" ref={drawerRef}>
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
