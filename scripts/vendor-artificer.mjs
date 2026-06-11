// Vendor the Artificer design-system runtime files from the pinned npm package
// into the SPA's served directory.
//
// Source of truth is `site/node_modules/@cameronsjo/artificer` at the exact
// version in `site/package-lock.json`; the served copies under
// `site/public/artificer/` are GENERATED (gitignored) and re-emitted on every
// `npm run dev` / `npm run build` via the `predev` / `prebuild` hooks. No drift:
// the lockfile is the single version source.
//
// Copies every top-level *.css / *.js / *.json from the package `src/` by glob,
// not a hand-maintained list — a future module rides in by existing (closes the
// FILES-array omission class, upstream #205). The `assets/` subdir (fonts,
// favicon, og-images) is excluded naturally: it's a directory, and its files
// match no extension here. Those assets stay committed — their @font-face / og
// url() paths are version-stable (same rule the old revendor script held).
//
// Stopgap: retire this in favor of upstream's canonical vendor script once it
// ships (cameronsjo/artificer-design-system#219).
//
// Usage: npm run vendor:artificer (or `node ../scripts/vendor-artificer.mjs`)
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const srcDir = join(here, '..', 'site', 'node_modules', '@cameronsjo', 'artificer', 'src')
const destDir = join(here, '..', 'site', 'public', 'artificer')

// Anchored on the package, not the network — a missing src dir means the package
// isn't installed, so point at the fix rather than failing cryptically later.
let srcStat
try {
  srcStat = statSync(srcDir)
} catch {
  console.error(`error: ${srcDir} not found.`)
  console.error('  Run `npm install` in site/ first (installs @cameronsjo/artificer).')
  process.exit(1)
}
if (!srcStat.isDirectory()) {
  console.error(`error: ${srcDir} is not a directory.`)
  process.exit(1)
}

mkdirSync(destDir, { recursive: true })

// Clear stale generated copies first (top-level files only) so a module removed
// upstream doesn't linger. assets/ is a directory — left untouched.
for (const entry of readdirSync(destDir, { withFileTypes: true })) {
  if (entry.isFile()) rmSync(join(destDir, entry.name))
}

const isVendorable = (name) => /\.(css|js|json)$/.test(name)
const files = readdirSync(srcDir, { withFileTypes: true })
  .filter((e) => e.isFile() && isVendorable(e.name))
  .map((e) => e.name)
  .sort()

if (files.length === 0) {
  console.error(`error: no *.css/*.js/*.json files found in ${srcDir} — refusing to empty the vendor dir.`)
  process.exit(1)
}

console.log(`Vendoring ${files.length} files from @cameronsjo/artificer/src -> site/public/artificer/`)
for (const f of files) {
  copyFileSync(join(srcDir, f), join(destDir, f))
  console.log(`  ok ${f}`)
}

// Echo the served version the way the old shell script did — a fast eyeball that
// the copy reflects the pinned package.
const css = readFileSync(join(destDir, 'artificer.css'), 'utf8')
const version = css.match(/--art-version:\s*"([^"]+)"/)
console.log(version ? `Done. --art-version: ${version[1]}` : 'Done. (warning: --art-version not found in artificer.css)')
