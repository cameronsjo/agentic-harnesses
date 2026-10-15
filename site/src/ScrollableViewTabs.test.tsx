/** @vitest-environment jsdom */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { ScrollableViewTabs } from './ScrollableViewTabs'

class ResizeObserverStub {
  static instances: ResizeObserverStub[] = []
  private readonly callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    ResizeObserverStub.instances.push(this)
  }

  observe() {}
  disconnect() {}
  unobserve() {}

  trigger() {
    this.callback([], this as unknown as ResizeObserver)
  }
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.append(container)
  ResizeObserverStub.instances = []
  const reactGlobals = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  reactGlobals.IS_REACT_ACT_ENVIRONMENT = true
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('ScrollableViewTabs', () => {
  it('updates both edge cues from ResizeObserver and scroll events', () => {
    act(() => {
      root = createRoot(container)
      root.render(
        <ScrollableViewTabs>
          <button type="button">Loop</button>
          <button type="button">Across the wire</button>
        </ScrollableViewTabs>,
      )
    })
    expect(ResizeObserverStub.instances).toHaveLength(1)
    act(() => {
      root.render(
        <ScrollableViewTabs>
          <button type="button">Loop</button>
          <button type="button">Across the wire</button>
        </ScrollableViewTabs>,
      )
    })
    expect(ResizeObserverStub.instances).toHaveLength(1)

    const tabs = container.querySelector('[role="tablist"]') as HTMLDivElement
    const leftFade = container.querySelector('.view-tabs-fade[data-show="false"]')
    const rightFade = container.querySelector('.view-tabs-fade[data-show="false"]')
    expect(tabs).not.toBeNull()
    expect(leftFade).not.toBeNull()
    expect(rightFade).not.toBeNull()

    Object.defineProperties(tabs, {
      clientWidth: { configurable: true, value: 100 },
      scrollWidth: { configurable: true, value: 140 },
      scrollLeft: { configurable: true, value: 0, writable: true },
    })

    act(() => ResizeObserverStub.instances[0]?.trigger())
    expect(container.querySelector('.compare-fade--right')?.getAttribute('data-show')).toBe('true')
    expect(container.querySelector('.compare-fade--left')?.getAttribute('data-show')).toBe('false')

    Object.defineProperty(tabs, 'scrollLeft', { configurable: true, value: 40, writable: true })
    act(() => tabs.dispatchEvent(new Event('scroll')))
    expect(container.querySelector('.compare-fade--right')?.getAttribute('data-show')).toBe('false')
    expect(container.querySelector('.compare-fade--left')?.getAttribute('data-show')).toBe('true')
  })

  it('wires the component into App after selecting a harness', () => {
    act(() => {
      root = createRoot(container)
      root.render(<App />)
    })

    const claudeCode = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent?.trim() === 'Claude Code',
    )
    expect(claudeCode).not.toBeUndefined()
    act(() => claudeCode?.click())

    expect(container.querySelector('.view-tabs-scroll [role="tablist"]')).not.toBeNull()
    expect(container.querySelectorAll('.view-tabs-scroll [role="tab"]').length).toBe(4)
  })
})
