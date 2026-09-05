import { describe, expect, it } from 'vitest'
import { specs } from './data'
import claudeCodeWire from './data/wire/claude-code.json'
import curlWalkthrough from './data/wire/curl-walkthrough.json'

/**
 * Collects every string value in a JSON-shaped object, regardless of field
 * name — `**…**` anchor markers can land in any prose field (note, title,
 * annotation) and a future field shouldn't need this test updated to look for it.
 */
function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out))
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectStrings(v, out))
  return out
}

// Mirrors the capturing split in Anchored.tsx exactly — "well-formed" here
// means Anchored renders the string as intended, not just that it parses.
const ANCHOR_RE = /\*\*(.+?)\*\*/g

/**
 * A malformed marker leaves literal "**" behind in a plain-text (even-index)
 * segment: an unmatched single delimiter, an empty "****" span with nothing to
 * capture, or any other stray pair. Well-formed text consumes every "**" pair
 * into a bolded span, leaving none in the surrounding plain text.
 */
function hasStrayAsterisks(text: string): boolean {
  const parts = text.split(ANCHOR_RE)
  return parts.some((part, i) => i % 2 === 0 && part.includes('**'))
}

describe('anchor markers (**…**) are well-formed across the wire and loop JSON data', () => {
  const sources: [string, unknown][] = [
    ['data/wire/claude-code.json', claudeCodeWire],
    ['data/wire/curl-walkthrough.json', curlWalkthrough],
    ...specs.map((s): [string, unknown] => [`data/loops/${s.harness}.json`, s]),
  ]

  it.each(sources)('%s carries no stray or unmatched ** markers', (_label, data) => {
    const strings = collectStrings(data).filter((s) => s.includes('**'))
    for (const s of strings) {
      expect(hasStrayAsterisks(s), `stray ** survives in: ${JSON.stringify(s)}`).toBe(false)
    }
  })

  it('at least one source actually carries anchor markers (so the check above is not vacuous)', () => {
    const anyMarked = [claudeCodeWire, curlWalkthrough, ...specs].some((d) =>
      collectStrings(d).some((s) => /\*\*(.+?)\*\*/.test(s)),
    )
    expect(anyMarked).toBe(true)
  })
})
