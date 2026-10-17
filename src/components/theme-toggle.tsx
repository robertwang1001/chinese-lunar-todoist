'use client'

import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  function toggleTheme() {
    const root = document.documentElement
    const dark = root.classList.toggle('dark')
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light')
    }
    catch {
      // The visual toggle still works when browser storage is unavailable.
    }
  }

  return (
    <Button
      aria-label="Toggle color theme"
      className="size-9 rounded-full p-0"
      onClick={toggleTheme}
      title="Toggle color theme"
      type="button"
      variant="outline"
    >
      <Sun aria-hidden="true" className="hidden size-4 dark:block" />
      <Moon aria-hidden="true" className="size-4 dark:hidden" />
    </Button>
  )
}
