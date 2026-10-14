import { useEffect, useRef, useState, type ReactNode } from 'react'
import { tabScrollEdges } from './tab-scroll'

export function ScrollableViewTabs({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const next = tabScrollEdges(el.scrollLeft, el.clientWidth, el.scrollWidth)
      setEdges(old => old.left === next.left && old.right === next.right ? old : next)
    }
    const observer = new ResizeObserver(update)
    observer.observe(el)
    // Tab labels can change size when the bundled fonts finish loading.
    Array.from(el.children).forEach(child => observer.observe(child))
    el.addEventListener('scroll', update, { passive: true })
    update()
    return () => {
      observer.disconnect()
      el.removeEventListener('scroll', update)
    }
  }, [children])

  return (
    <div className="view-tabs-scroll">
      <div ref={ref} className="tabs" role="tablist" aria-label="View">{children}</div>
      <div className="compare-fade compare-fade--left view-tabs-fade" data-show={edges.left} aria-hidden="true" />
      <div className="compare-fade compare-fade--right view-tabs-fade" data-show={edges.right} aria-hidden="true" />
    </div>
  )
}
