# Artificer adaptations

How this project bends the Artificer design system, and why. Each entry mirrors a
feedback issue filed upstream.

## 2026-05-31 — v0.6 → v0.10.1 full re-vendor

- **Upstream issue:** cameronsjo/artificer-design-system#77
- **Install path:** A (vanilla vendored copy under `site/public/artificer/`)
- **Pivot:** Crossed every boundary (0.8→0.9→0.10.0→0.10.1) in one All-in re-vendor via `/artificer-upgrade`.
- **Finding:** All three matrix-flagged high-risk boundaries were already no-ops here:
  - px→rem (0.10.0): app already fully `rem`-based, no `--t-*-size` overrides.
  - theme key (0.10.0): already `'artificer.theme'` (dot) in `artificer-theme.js` + `App.tsx`.
  - brandPurpleBright/`.tok-keyword` (0.10.1): app emits no `tok-*` spans; syntax CSS dormant.
- **Only real change:** Added the inline FOUC bootstrap (`theme-bootstrap.html`) to `index.html` `<head>` before first paint; kept the deferred `artificer-theme.js` for the runtime API. `App.tsx` unchanged (its `.theme-toggle` class never collides with the new `[data-theme-toggle]` `bind()`).
- **Upstream bug reported:** `main/src/artificer.css` banner still says "v0.6" while `--art-version` is `0.10.1` — banner-based detection misleads.
- **Lane:** 3 (no palette value or role-name changes).
