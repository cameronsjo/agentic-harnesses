// Verifies every relative .md link in README.md and docs/**/*.md resolves to a real file.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const root = resolve(dirname(new URL(import.meta.url).pathname), '..')

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (p.endsWith('.md')) out.push(p)
  }
  return out
}

const files = [join(root, 'README.md'), ...walk(join(root, 'docs'))]
const linkRe = /\]\(([^)]+)\)/g
let total = 0
let broken = 0

for (const file of files) {
  const text = readFileSync(file, 'utf8')
  let m
  while ((m = linkRe.exec(text))) {
    const raw = m[1].trim()
    if (/^(https?:|mailto:|#)/.test(raw)) continue // external / anchor-only
    const target = raw.split('#')[0]
    if (!target) continue
    total++
    const resolved = join(dirname(file), target)
    if (!existsSync(resolved)) {
      broken++
      console.error(`BROKEN  ${file.replace(root + '/', '')}  ->  ${raw}`)
    }
  }
}

console.log(`checked ${total} relative links across ${files.length} files; ${broken} broken`)
process.exit(broken ? 1 : 0)
