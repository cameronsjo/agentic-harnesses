import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  /** Accessible label / heading for the expanded view (e.g. the harness name). */
  title: string
  children: ReactNode
}

/**
 * Full-screen-ish overlay for an enlarged, mobile-friendly diagram. Reuses
 * Artificer's `.scrim`/`.modal` plus `ArtificerFocus.trap` (Tab cycles within,
 * Esc closes); a scrim click closes; body scroll locks while open. Rendered
 * null when closed, so the background stays interactive-free via the scrim.
 */
export function GraphModal({ open, onClose, title, children }: Props) {
  const modalRef = useRef<HTMLDivElement>(null)
  // Keep onClose current without re-running the trap effect (which would steal
  // focus back to the first element on every parent render).
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const handle = window.ArtificerFocus?.trap(modalRef.current, { onEscape: () => onCloseRef.current() })
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      handle?.release()
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  if (!open) return null
  return (
    <div
      className="scrim graph-scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="modal graph-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${title} — expanded diagram`}
        ref={modalRef}
      >
        <header className="graph-modal__bar">
          <b className="graph-modal__title">{title}</b>
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            aria-label="Close expanded diagram"
            onClick={onClose}
          >
            <i data-icon="x" />
          </button>
        </header>
        <div className="graph-modal__body">{children}</div>
      </div>
    </div>
  )
}
