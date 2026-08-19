import { useEffect, useState, type CSSProperties, type KeyboardEvent } from 'react'
import {
  AppShell,
  AppShellContent,
  Appbar,
  NavDrawer,
  SideNav,
  SideNavFooter,
  ThemeToggle,
  type SideNavGroup,
} from '@cameronsjo/artificer/react'
import { specs } from './data'
import { KIND_COLOR, KIND_LABEL, type NodeKind } from './types'
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

// The between-surface spine: "Compare all" plus one item per harness. These switch
// app state rather than navigate, so each SideNavItem carries onSelect, not href.
// Rendered twice (persistent rail + drawer) from the same source of truth — the
// chrome adapter's SideNav owns the markup, this just shapes the data.
function harnessGroups(harness: string | null, onSelect: (h: string | null) => void): SideNavGroup[] {
  return [
    {
      key: 'overview',
      label: 'Overview',
      items: [{ key: 'compare-all', label: 'Compare all', active: harness === null, onSelect: () => onSelect(null) }],
    },
    {
      key: 'harnesses',
      label: 'Harnesses',
      items: specs.map((s) => ({
        key: s.harness,
        label: s.displayName,
        active: harness === s.harness,
        onSelect: () => onSelect(s.harness),
      })),
    },
  ]
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
  // The Appbar chrome component owns the wordmark markup (brandWhimsy prop
  // adds .whimsy), so there's no ref to attach here — query the DOM node it
  // renders after mount instead. React mounts after DOMContentLoaded, so
  // this run() is still the hook regardless.
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('.appbar__brand .wordmark')
    const cancel = window.Whimsy?.run(el, { loops: 3, settle: 'glacial' })
    return () => cancel?.()
  }, [])

  // The icon script only hydrates `<i data-icon>` once on DOMContentLoaded, which
  // misses anything React mounts later (the expand-modal close button, the mobile
  // drawer). observe() re-hydrates and watches for inserted nodes so those icons
  // aren't blank. Returns a disconnect fn for unmount.
  useEffect(() => window.ArtificerIcons?.observe(), [])

  // The footer's seasonal greeting (June → "happy pride"). Whimsy auto-inits on
  // DOMContentLoaded — before React mounts the footer — so greeting() is re-run
  // here to swap the React-mounted [data-whimsy-greeting] node.
  useEffect(() => {
    window.Whimsy?.greeting()
  }, [])

  // Mobile drawer focus management (inert while closed, focus-trapped while open,
  // Esc/scrim close it) now lives entirely in the NavDrawer chrome component —
  // no local ref/effect needed.

  // Legend belongs to graph contexts; the wire view draws its own request anatomy.
  const showLegend = harness === null || activeTab !== 'wire'

  // Roving-tabindex arrow nav for the view tablist (WAI-ARIA tabs, automatic
  // activation). The index math is sourced from ArtificerTabs.nextIndex — the
  // upstream WAI-ARIA state machine (artificer-tabs.js), which retires the hand-rolled
  // duplicate this app used to carry (adaptation #92). React keeps owning the DOM:
  // selection (setTab) and focus-follows-selection. That split — state machine
  // from the module, framework owns the DOM — is the React-consumer rule; full
  // enhance() is rejected (it toggles panel.hidden / aria-selected on nodes React
  // owns, and snapshots a tab set that's dynamic per harness here).
  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const cur = availableTabs.indexOf(activeTab)
    // nextIndex yields `undefined` when the global is absent (the <script defer>
    // hasn't loaded / was stripped) and `null` when the key isn't a tab-nav key —
    // both mean "do nothing", so a loose `== null` collapses them BEFORE we
    // preventDefault / move selection. No inline-math fallback: re-deriving the
    // index here would resurrect the duplicated state machine this change retires.
    const target = window.ArtificerTabs?.nextIndex(e.key, cur, availableTabs.length, {
      orientation: 'horizontal',
    })
    // Trailing bounds check is defensive: nextIndex's contract is an index in
    // [0, length), but a library regression returning out-of-range would otherwise
    // push setTab(undefined) into state. Cheap guard, no behavior change in practice.
    if (target == null || target < 0 || target >= availableTabs.length) return
    e.preventDefault()
    setTab(availableTabs[target])
    const btns = e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    btns?.[target]?.focus()
  }

  return (
    <div className="app container container--lg surface-tool">
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

      {/* contained: our bar sits inside .container--lg, which owns the inline
          gutter — zero the full-bleed padding. sticky={false}: opt out of
          sticky for this compact tool surface. brandWhimsy: the wordmark is
          the sanctioned .whimsy home in the bar. */}
      <Appbar
        brand="agentic harnesses"
        brandHref="#main"
        brandWhimsy
        contained
        sticky={false}
        menu={{ controls: 'nav-drawer', open: navOpen, onClick: () => setNavOpen((v) => !v) }}
        actions={
          // Hidden <=800px — the drawer footer below is the mobile home for
          // this control (matches upstream Artificer's #17 pattern).
          <ThemeToggle inline className="topbar-theme-toggle" />
        }
      />

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

          <AppShell rail="200px" gap="var(--s-lg)">
            <SideNav
              groups={harnessGroups(harness, selectHarness)}
              sticky
              style={{ '--sidenav-sticky-top': 'var(--s-md)' } as CSSProperties}
            />

            <AppShellContent id="main" className="stack stack--lg">
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
            </AppShellContent>
          </AppShell>
        </>
      )}

      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} id="nav-drawer" label="Harnesses">
        <SideNav groups={harnessGroups(harness, selectHarness)} footer={<SideNavFooter />} />
      </NavDrawer>

      <AppFooter />
    </div>
  )
}

/**
 * Slim footer: a one-line colophon + the standalone-page links. The two heavy
 * disclosure paragraphs moved to the Disclosure page (#disclosure); this keeps
 * a tagline + links to About / Disclosure / issues. Structured so the deferred
 * "happy pride" footer variant (Part 4) is a one-line tagline swap.
 *
 * Built on Artificer's `.colophon` / `.colophon__spine` primitive (#97) —
 * positional slots (first starts, last ends, middle centers), all type
 * treatment and the mobile stack come from the package. No footer CSS here.
 */
function AppFooter() {
  return (
    <footer className="colophon">
      <div className="container">
        <div className="colophon__spine">
          <span>
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
          {/* Seasonal greeting — Whimsy.greeting() swaps [data-whimsy-greeting] by date:
              June → "happy pride" (rainbow wave); off-season → the inline fallback
              (graceful with JS off). greeting() runs from a mount effect in App()
              (Whimsy's DOMContentLoaded auto-init fires before React mounts this
              footer). */}
          <span data-whimsy-greeting data-whimsy-greeting-class="whimsy--glacial">
            kindness is a choice.
          </span>
          <nav className="cluster" aria-label="About this site">
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
        </div>
      </div>
    </footer>
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
