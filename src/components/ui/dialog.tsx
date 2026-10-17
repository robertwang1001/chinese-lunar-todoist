'use client'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { useEffect } from 'react'

export function Dialog({ children, description, onClose, open, title }: {
  children: ReactNode
  description?: string
  onClose: () => void
  open: boolean
  title: string
}) {
  useEffect(() => {
    if (!open)
      return
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [onClose, open])
  if (!open)
    return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section aria-describedby={description ? 'dialog-description' : undefined} aria-labelledby="dialog-title" aria-modal="true" className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-background p-6 shadow-2xl" role="dialog">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold" id="dialog-title">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted-foreground" id="dialog-description">{description}</p>}
          </div>
          <button aria-label="Close" className="grid size-9 shrink-0 place-items-center rounded-lg hover:bg-accent" type="button" onClick={onClose}><X className="size-4" /></button>
        </div>
        <div className="mt-5">{children}</div>
      </section>
    </div>
  )
}
