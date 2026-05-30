// Validates every loop spec against schema.json and enforces cross-harness invariants.
// Run via `npm run validate` (also wired into `npm run build`).
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv from 'ajv/dist/2020.js'

const here = dirname(fileURLToPath(import.meta.url))
const loopsDir = join(here, '..', 'src', 'data', 'loops')

const schema = JSON.parse(readFileSync(join(loopsDir, 'schema.json'), 'utf8'))
const ajv = new Ajv({ allErrors: true, strict: false })
const validate = ajv.compile(schema)

const files = readdirSync(loopsDir).filter((f) => f.endsWith('.json') && f !== 'schema.json')

let failed = false
const scenarioSets = {}

for (const file of files) {
  const spec = JSON.parse(readFileSync(join(loopsDir, file), 'utf8'))

  if (!validate(spec)) {
    failed = true
    console.error(`✗ ${file} — schema validation failed:`)
    for (const err of validate.errors) console.error(`    ${err.instancePath || '/'} ${err.message}`)
    continue
  }

  // Every edge endpoint and every scenario step must reference a declared node id.
  const ids = new Set(spec.nodes.map((n) => n.id))
  for (const e of spec.edges) {
    for (const end of [e.from, e.to]) {
      if (!ids.has(end)) {
        failed = true
        console.error(`✗ ${file} — edge references unknown node id "${end}"`)
      }
    }
  }
  for (const s of spec.scenarios) {
    for (const step of s.steps) {
      if (!ids.has(step)) {
        failed = true
        console.error(`✗ ${file} — scenario "${s.id}" step references unknown node id "${step}"`)
      }
    }
  }

  scenarioSets[spec.harness] = spec.scenarios.map((s) => s.id).sort()
  if (!failed) console.log(`✓ ${file} — ${spec.nodes.length} nodes, ${spec.edges.length} edges, ${spec.scenarios.length} scenarios`)
}

// Scenario-ID parity: the side-by-side comparison depends on all harnesses sharing scenarios.
const harnesses = Object.keys(scenarioSets)
if (harnesses.length > 1) {
  const reference = JSON.stringify(scenarioSets[harnesses[0]])
  for (const h of harnesses.slice(1)) {
    if (JSON.stringify(scenarioSets[h]) !== reference) {
      failed = true
      console.error(`✗ scenario-id parity broken: ${harnesses[0]}=${reference} vs ${h}=${JSON.stringify(scenarioSets[h])}`)
    }
  }
  if (!failed) console.log(`✓ scenario-id parity across ${harnesses.length} harnesses: ${reference}`)
}

if (failed) {
  console.error('\nLoop validation FAILED.')
  process.exit(1)
}
console.log(`\nLoop validation passed (${files.length} spec${files.length === 1 ? '' : 's'}).`)
