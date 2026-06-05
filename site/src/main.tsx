import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Artificer design system, consumed from the published npm package (replaces the
// frozen vendored copy that used to live under public/artificer/). CSS first so
// Vite resolves the @font-face url('assets/fonts/…') paths on import; base before
// whimsy; print.css is internally @media print-wrapped, so it's safe unscoped.
// The JS helpers are side-effecting IIFEs that set window.* globals (Whimsy,
// ArtificerIcons, ArtificerFocus, ArtificerTabs) — App.tsx calls them imperatively.
// theme.js is intentionally NOT imported: App.tsx owns the toggle in React.
import '@cameronsjo/artificer/artificer.css'
import '@cameronsjo/artificer/whimsy.css'
import '@cameronsjo/artificer/print.css'
import '@cameronsjo/artificer/whimsy.js'
import '@cameronsjo/artificer/icons.js'
import '@cameronsjo/artificer/focus.js'
import '@cameronsjo/artificer/tabs.js'
import { App } from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
