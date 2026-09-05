import { describe, expect, it } from 'vitest'
import { isValidElement } from 'react'
import { Anchored } from './Anchored'

/**
 * Anchored is a function component, so calling it directly (not through JSX)
 * returns the React element tree without needing to render it — no jsdom
 * required, same "inspect the pure structure" approach data.test.ts and
 * sequence.test.ts use for their non-DOM data shapes.
 */
function anchorSpans(text: string): { anchor: boolean; text: string }[] {
  const el = Anchored({ text })
  const children = (el.props as { children: unknown }).children
  const list = Array.isArray(children) ? children : [children]
  return list.map((child) => {
    if (!isValidElement(child)) throw new Error('expected a React element in Anchored output')
    const props = child.props as { children: string; className?: string }
    return { anchor: child.type === 'b' && props.className === 'anchor', text: props.children }
  })
}

describe('Anchored — **…** marker parsing', () => {
  it('renders unmarked text as a single non-anchor span', () => {
    expect(anchorSpans('hello world')).toEqual([{ anchor: false, text: 'hello world' }])
  })

  it('promotes one marked span to an anchor, keeping the surrounding text plain', () => {
    expect(anchorSpans('a **b** c')).toEqual([
      { anchor: false, text: 'a ' },
      { anchor: true, text: 'b' },
      { anchor: false, text: ' c' },
    ])
  })

  it('handles a marker at the start of the string', () => {
    expect(anchorSpans('**bold** text')).toEqual([
      { anchor: false, text: '' },
      { anchor: true, text: 'bold' },
      { anchor: false, text: ' text' },
    ])
  })

  it('handles a marker at the end of the string', () => {
    expect(anchorSpans('text **bold**')).toEqual([
      { anchor: false, text: 'text ' },
      { anchor: true, text: 'bold' },
      { anchor: false, text: '' },
    ])
  })

  it('promotes every marked span when there are several, non-adjacent', () => {
    expect(anchorSpans('**a** x **b**')).toEqual([
      { anchor: false, text: '' },
      { anchor: true, text: 'a' },
      { anchor: false, text: ' x ' },
      { anchor: true, text: 'b' },
      { anchor: false, text: '' },
    ])
  })

  it('handles two markers with no text between them (empty plain span, not a bug)', () => {
    expect(anchorSpans('**a****b**')).toEqual([
      { anchor: false, text: '' },
      { anchor: true, text: 'a' },
      { anchor: false, text: '' },
      { anchor: true, text: 'b' },
      { anchor: false, text: '' },
    ])
  })

  it('leaves an unmatched marker as literal asterisks (no closing pair)', () => {
    // Regression guard for the bug this branch fixed elsewhere: a malformed
    // marker in the data must NOT crash the parser — it degrades to literal text.
    expect(anchorSpans('text with **unmatched marker')).toEqual([
      { anchor: false, text: 'text with **unmatched marker' },
    ])
  })

  it('leaves an empty "****" span as literal asterisks (no content to capture)', () => {
    expect(anchorSpans('a **** b')).toEqual([{ anchor: false, text: 'a **** b' }])
  })

  it('renders an empty string as a single empty non-anchor span', () => {
    expect(anchorSpans('')).toEqual([{ anchor: false, text: '' }])
  })
})
