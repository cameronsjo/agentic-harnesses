import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { specs } from './data'
import { KIND_COLOR, KIND_LABEL, type NodeKind } from './types'
import { onRovingTabKeyDown } from './keyboard'
import { ScenarioCompare } from './ScenarioCompare'
import { LoopPlayer } from './LoopPlayer'
import { HooksView } from './HooksView'
import { WireView } from './WireView'
import { SequenceView } from './SequenceView'
import { AboutView } from './AboutView'
import { DisclosureView } from './DisclosureView'

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

// Lightweight hash routing for the two standalone prose pages — no router dep.
// Any hash that isn't a known page (including '', '#main' for the skip-link)
// resolves to `null` = the harness app. Linkable, shareable, reload-safe, and
// the browser back button just works (hashchange).
type Route = 'about' | 'disclosure' | null

function readRoute(): Route {
  const h = window.location.hash.replace(/^#/, '')
  return h === 'about' || h === 'disclosure' ? h : null
}

function useRoute(): Route {
  const [route, setRoute] = useState<Route>(readRoute)
  useEffect(() => {
    const onHash = () => setRoute(readRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return route
}

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
  const route = useRoute() // null = harness app; 'about' / 'disclosure' = prose page

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
    // If a prose page is open (e.g. the drawer was used from #about), picking a
    // harness should return to the app. Routing back to #main also lands the
    // skip-anchor; readRoute() maps it to null so the harness view renders.
    if (route) window.location.hash = '#main'
  }

  // Prose pages are standalone documents — start them at the top, not wherever
  // the harness app was scrolled. Only fires on a route change into a page.
  useEffect(() => {
    if (route) window.scrollTo(0, 0)
  }, [route])

  // The one persistent whimsy moment: the wordmark breathes the ultrathink
  // shimmer (spectrum) for three hue-cycles on load, then drifts glacially.
  // React mounts after DOMContentLoaded, so the ref-driven run() is the hook.
  const titleRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const cancel = window.Whimsy?.run(titleRef.current, { loops: 3, settle: 'glacial' })
    return () => cancel?.()
  }, [])

  // The icon script only hydrates `<i data-icon>` once on DOMContentLoaded, which
  // misses anything React mounts later (the expand-modal close button, the mobile
  // drawer). observe() re-hydrates and watches for inserted nodes so those icons
  // aren't blank. Returns a disconnect fn for unmount.
  useEffect(() => window.ArtificerIcons?.observe(), [])

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

  return (
    <div className="app container container--lg surface-tool" data-nav-open={navOpen ? '' : undefined}>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          // Skip to THIS page's <main> by moving focus — never via the bare hash.
          // On a prose page, letting the browser set #main would trip useRoute
          // (#main → null) and navigate away from the content we're skipping to.
          // (#main stays the deliberate return-to-app signal for the brand link,
          // the "Back to the harnesses" links, and selectHarness — just not here.)
          e.preventDefault()
          const main = document.getElementById('main')
          if (!main) return
          main.setAttribute('tabindex', '-1') // make the non-interactive <main> a focus target
          main.focus()
          main.scrollIntoView()
        }}
      >
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
          onClick={() => setNavOpen((v) => !v)}
        >
          <i data-icon="menu" data-icon-size="32" />
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

      {route ? (
        // Standalone prose page — replaces the masthead + harness shell, keeps the
        // appbar/footer chrome. The <main> carries `id="main"` for the skip-link.
        <main id="main">{route === 'about' ? <AboutView /> : <DisclosureView />}</main>
      ) : (
        <>
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
                      // Roving-tabindex arrow nav (WAI-ARIA tabs, automatic activation);
                      // React owns selection — see onRovingTabKeyDown in ./keyboard.
                      onKeyDown={(e) =>
                        onRovingTabKeyDown(e, availableTabs.indexOf(activeTab), availableTabs.length, (n) =>
                          setTab(availableTabs[n]),
                        )
                      }
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
        </>
      )}

      {/* Mobile drawer: scrim + off-canvas sidenav. data-nav-open on .app drives both. */}
      <div className="nav-scrim" onClick={() => setNavOpen(false)} />
      <aside id="nav-drawer" className="nav-drawer" ref={drawerRef}>
        <HarnessNav harness={harness} onSelect={selectHarness} />
      </aside>

      <AppFooter />
    </div>
  )
}

/**
 * Slim footer: a one-line colophon + the standalone-page links. The two heavy
 * disclosure paragraphs moved to the Disclosure page (#disclosure); this keeps
 * a tagline + links to About / Disclosure / issues. Structured so the deferred
 * "happy pride" footer variant (Part 4) is a one-line tagline swap.
 */
function AppFooter() {
  return (
    <footer className="app-footer site-footer">
      {/* TODO(pride): when @cameronsjo/artificer publishes the "happy pride" footer
          variant (June, full Whimsy, no trailing period), bump the dep and swap the
          tagline span below for the primitive. Tracked in the upstream intro
          2026-06-05-1205-pride-footer-and-nav-primitives.md. */}
      <span className="footer-tagline">
        Independent reconstruction · built with <b className="anchor">Claude&nbsp;Code</b> on the{' '}
        <a
          className="anchor"
          href="https://cameronsjo.github.io/artificer/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Artificer design system
        </a>
      </span>
      <nav className="footer-links cluster" aria-label="About this site">
        <a className="anchor" href="#about">
          About
        </a>
        <a className="anchor" href="#disclosure">
          Disclosure
        </a>
        <a className="anchor" href="https://github.com/cameronsjo/agentic-harnesses/issues">
          Open an issue
        </a>
      </nav>
    </footer>
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
