'use client'
import type { EventConfig } from '@/lib/events'
import { CalendarDays, CheckCircle2, Info, Link2, LogOut, Sparkles } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { eventSchema, occurrences } from '@/lib/events'
import { cn } from '@/lib/utils'

const storageKey = 'lunar-todoist-event-v1'
const subscribe = () => () => {}
const dateFormatter = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
  weekday: 'short',
  year: 'numeric',
})

function displayDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00Z`))
}

export function Planner({
  connected,
  configured,
}: {
  connected: boolean
  configured: boolean
}) {
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
  return ready
    ? (
        <PlannerForm connected={connected} configured={configured} />
      )
    : (
        <main className="p-6">Loading planner…</main>
      )
}
function load() {
  const initial = {
    event: {
      id: crypto.randomUUID(),
      title: 'Birthday',
      month: 10,
      day: 1,
      leap: false,
      count: 5,
      from: new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date()),
    },
    known: {} as Record<string, string>,
  }
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null')
    if (saved) {
      return {
        event: eventSchema.parse(saved.event),
        known: saved.known || {},
      }
    }
  }
  catch {}
  return initial
}
function PlannerForm({
  connected,
  configured,
}: {
  connected: boolean
  configured: boolean
}) {
  const [initial] = useState(load)
  const [event, setEvent] = useState<EventConfig>(initial.event)
  const [known, setKnown] = useState<Record<string, string>>(initial.known)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const ready = true
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ event, known }))
    }
    catch {
      /* Browser may disable persistent storage. */
    }
  }, [event, known])
  let dates: string[] = []
  let error = ''
  if (ready) {
    try {
      dates = occurrences(event)
    }
    catch (e) {
      error = (e as Error).message
    }
  }
  async function sync() {
    setBusy(true)
    setStatus('Working…')
    try {
      const r = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, known }),
      })
      const data = await r.json()
      if (data.known)
        setKnown(data.known)
      if (!r.ok)
        throw new Error(data.error)
      setStatus(
        `Created ${data.created}; updated ${data.updated}. Completed or removed tasks are left alone.`,
      )
    }
    catch (e) {
      setStatus((e as Error).message)
    }
    finally {
      setBusy(false)
    }
  }
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <nav className="flex items-center justify-between" aria-label="Primary">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground shadow-sm">
            月
          </span>
          <div>
            <p className="font-semibold tracking-tight">Lunar Planner</p>
            <p className="text-xs text-muted-foreground">for Todoist</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-xs sm:flex">
            <span className={cn('size-1.5 rounded-full', connected ? 'bg-emerald-500' : 'bg-muted-foreground/50')} />
            {connected ? 'Todoist connected' : 'Preview mode'}
          </span>
          <ThemeToggle />
        </div>
      </nav>

      <header className="max-w-3xl py-12 sm:py-16">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-primary shadow-xs">
          <Sparkles aria-hidden="true" className="size-3.5" />
          农历 dates, without recurring-task workarounds
        </div>
        <h1 className="text-4xl font-semibold tracking-[-0.035em] text-balance sm:text-5xl lg:text-6xl">
          Turn lunar moments into
          {' '}
          <span className="text-primary">concrete plans.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
          Choose a lunar date, preview its Gregorian occurrences, and create
          ordinary Todoist tasks you can update later.
        </p>
      </header>

      {!configured && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-primary/20 bg-accent/60 p-4 text-sm text-accent-foreground">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>
            Preview is ready. Todoist sync becomes available after the owner
            configures OAuth credentials.
          </p>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.82fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Event details</CardTitle>
                <CardDescription>Saved automatically in this browser.</CardDescription>
              </div>
              {connected
                ? (
                    <Button
                      className="h-9 px-3"
                      onClick={async () => {
                        await fetch('/api/auth/logout', { method: 'POST' })
                        location.reload()
                      }}
                      type="button"
                      variant="ghost"
                    >
                      <LogOut aria-hidden="true" className="size-4" />
                      <span className="hidden sm:inline">Disconnect</span>
                    </Button>
                  )
                : configured
                  ? (
                      <a
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
                        href="/api/auth/login"
                      >
                        <Link2 aria-hidden="true" className="size-4" />
                        Connect
                      </a>
                    )
                  : null}
            </div>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-5 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault()
                sync()
              }}
            >
              <Label className="sm:col-span-2" htmlFor="event-title">
                Event title
                <Input
                  id="event-title"
                  value={event.title}
                  maxLength={200}
                  onChange={e => setEvent({ ...event, title: e.target.value })}
                />
              </Label>
              {(['month', 'day', 'count'] as const).map(key => (
                <Label key={key} htmlFor={`event-${key}`}>
                  {key === 'count' ? 'Occurrences' : `Lunar ${key}`}
                  <Input
                    id={`event-${key}`}
                    type="number"
                    min={1}
                    max={key === 'month' ? 12 : key === 'day' ? 30 : 20}
                    value={event[key]}
                    onChange={e =>
                      setEvent({ ...event, [key]: Number(e.target.value) })}
                  />
                </Label>
              ))}
              <Label htmlFor="event-from">
                Starting from
                <Input
                  id="event-from"
                  type="date"
                  value={event.from}
                  onChange={e => setEvent({ ...event, from: e.target.value })}
                />
              </Label>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border bg-muted/45 px-4 py-3 text-sm sm:col-span-2">
                <input
                  className="size-4 accent-[var(--primary)]"
                  type="checkbox"
                  checked={event.leap}
                  onChange={e => setEvent({ ...event, leap: e.target.checked })}
                />
                <span>
                  <span className="font-medium">Leap month only</span>
                  <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                    Years without this leap month will be skipped.
                  </span>
                </span>
              </label>
              <div className="flex gap-2 text-xs leading-5 text-muted-foreground sm:col-span-2">
                <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                <p>
                  Missing day 30 is skipped. Search ends at lunar year 2100.
                  Reducing the count never deletes existing tasks.
                </p>
              </div>
              <Button
                className="sm:col-span-2"
                type="submit"
                disabled={!ready || !connected || busy || !!error || !dates.length}
              >
                <CalendarDays aria-hidden="true" className="size-4" />
                {busy ? 'Syncing…' : 'Create or update Todoist tasks'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:sticky lg:top-8">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Gregorian preview</CardTitle>
                <CardDescription>
                  {dates.length}
                  {' '}
                  {dates.length === 1 ? 'date' : 'dates'}
                  {' '}
                  ready
                </CardDescription>
              </div>
              <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground">
                <CalendarDays aria-hidden="true" className="size-5" />
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {error
              ? (
                  <p className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300" role="alert">
                    {error}
                  </p>
                )
              : (
                  <ol className="grid gap-2">
                    {dates.map((date, index) => (
                      <li className="group flex items-center gap-3 rounded-xl border bg-background/55 px-3 py-3 transition-colors hover:bg-muted/65" key={date}>
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground group-hover:bg-accent group-hover:text-accent-foreground">
                          {index + 1}
                        </span>
                        <time className="text-sm font-medium" dateTime={date}>
                          {displayDate(date)}
                        </time>
                        <CheckCircle2 aria-hidden="true" className="ml-auto size-4 text-primary/65" />
                      </li>
                    ))}
                  </ol>
                )}
            {ready && dates.length < event.count && !error && (
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                Only
                {' '}
                {dates.length}
                {' '}
                occurrences were found before 2101.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {status && (
        <p className="mt-6 rounded-xl border bg-card p-4 text-sm shadow-xs" role="status">
          {status}
        </p>
      )}
      <footer className="mx-auto max-w-3xl py-10 text-center text-xs leading-5 text-muted-foreground">
        Settings and task IDs stay in this browser. No database, background
        jobs, or automatic renewal. Disconnect here and revoke Todoist access
        to fully remove the token.
      </footer>
    </main>
  )
}
