import { useState } from 'react'
import { specs } from './data'
import { KIND_COLOR, KIND_LABEL, type NodeKind } from './types'
import { ScenarioCompare } from './ScenarioCompare'
import { LoopPlayer } from './LoopPlayer'

type View = 'compare' | 'single'

const KINDS: NodeKind[] = ['input', 'llm', 'tool', 'approval', 'execute', 'decision', 'terminal']

export function App() {
  const [view, setView] = useState<View>('compare')
  const [harness, setHarness] = useState(specs[0]?.harness ?? '')
  const [scenarioId, setScenarioId] = useState('edit-file')

  const spec = specs.find((s) => s.harness === harness) ?? specs[0]

  return (
    <div className="app">
      <header className="app-header">
        <div className="title-block">
          <h1>Agentic Harness Loops</h1>
          <p className="subtitle">
            How four coding agents run their loop, dispatch tools, and gate them — reconstructed from source.
          </p>
        </div>
        <button className="theme-toggle" data-theme-toggle aria-label="Toggle theme">
          <span className="dot" />
          <span data-theme-label>Dark</span>
        </button>
      </header>

      <nav className="view-nav cluster" role="tablist" aria-label="View">
        <button
          role="tab"
          aria-selected={view === 'compare'}
          className={`btn btn--ghost tab ${view === 'compare' ? 'tab--active' : ''}`}
          onClick={() => setView('compare')}
        >
          Compare all
        </button>
        <button
          role="tab"
          aria-selected={view === 'single'}
          className={`btn btn--ghost tab ${view === 'single' ? 'tab--active' : ''}`}
          onClick={() => setView('single')}
        >
          Single harness
        </button>
      </nav>

      <Legend />

      {specs.length === 0 ? (
        <p className="empty">No loop specs found. Add files under <code>src/data/loops/</code>.</p>
      ) : view === 'compare' ? (
        <ScenarioCompare />
      ) : (
        <section className="single">
          <div className="harness-pick cluster" role="tablist" aria-label="Harness">
            {specs.map((s) => (
              <button
                key={s.harness}
                role="tab"
                aria-selected={s.harness === spec.harness}
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

      <footer className="app-footer">
        Reconstructed from pinned sources · every node cites <code>file:line</code> · styled with the Artificer
        design system.
      </footer>
    </div>
  )
}

function Legend() {
  return (
    <div className="legend cluster" aria-label="Node kinds">
      {KINDS.map((k) => (
        <span key={k} className="legend-item">
          <span className="legend-chip" style={{ background: KIND_COLOR[k] }} />
          {KIND_LABEL[k]}
        </span>
      ))}
    </div>
  )
}
