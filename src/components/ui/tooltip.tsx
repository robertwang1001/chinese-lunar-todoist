import type { ReactNode } from 'react'

export function Tooltip({ children, content }: { children: ReactNode, content: string }) {
  return (
    <span className="group/tooltip relative inline-flex">
      {children}
      <span className="pointer-events-none absolute right-0 bottom-full z-50 mb-2 hidden w-max max-w-52 rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-md group-hover/tooltip:block group-focus-within/tooltip:block" role="tooltip">
        {content}
      </span>
    </span>
  )
}
