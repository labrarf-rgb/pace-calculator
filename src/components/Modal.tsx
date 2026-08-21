import { useEffect, useLayoutEffect, useRef } from 'react'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({ open, title, onClose, children }: Props) {
  const dialog = useRef<HTMLDivElement>(null)
  const restoreTo = useRef<HTMLElement | null>(null)

  // Callers usually pass an inline arrow, so `onClose` is a new function on every
  // render. Holding it in a ref keeps it out of the effect's dependencies: if the
  // effect re-ran per render its cleanup would pull focus back to the trigger,
  // which made typing in any field inside the dialog stop after one character.
  const closeRef = useRef(onClose)
  useLayoutEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    if (!open) return

    const node = dialog.current
    restoreTo.current = document.activeElement as HTMLElement | null

    const visibleItems = () =>
      Array.from(node?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
        (el) => el.offsetParent !== null,
      )

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeRef.current()
        return
      }
      if (e.key !== 'Tab') return

      // Keep tabbing inside the dialog while it is open.
      const items = visibleItems()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    visibleItems()[0]?.focus()

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      restoreTo.current?.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={dialog}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="ghost-btn icon-btn" onClick={onClose} aria-label="Close settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
