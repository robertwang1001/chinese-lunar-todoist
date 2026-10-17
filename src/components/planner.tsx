'use client'
import type { EventConfig } from '@/lib/events'
import type { Locale, TranslationKey } from '@/lib/i18n'
import { CalendarDays, CheckCircle2, Eye, Info, Link2, LogOut, Pencil, RefreshCw, Sparkles, Trash2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip } from '@/components/ui/tooltip'
import { occurrences, taskDescription } from '@/lib/events'
import { isLocale, localeFromLanguages, translate } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const subscribe = () => () => {}
const lunarMonthsCN = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月']
const lunarMonthsTW = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '臘月']
const lunarDaysZH = [
  '初一',
  '初二',
  '初三',
  '初四',
  '初五',
  '初六',
  '初七',
  '初八',
  '初九',
  '初十',
  '十一',
  '十二',
  '十三',
  '十四',
  '十五',
  '十六',
  '十七',
  '十八',
  '十九',
  '二十',
  '廿一',
  '廿二',
  '廿三',
  '廿四',
  '廿五',
  '廿六',
  '廿七',
  '廿八',
  '廿九',
  '三十',
]
function lunarLabels(locale: Locale) {
  if (locale === 'en') {
    return {
      days: Array.from({ length: 30 }, (_, index) => `Day ${index + 1}`),
      months: Array.from({ length: 12 }, (_, index) => `Month ${index + 1}`),
    }
  }
  return { days: lunarDaysZH, months: locale === 'zh-TW' ? lunarMonthsTW : lunarMonthsCN }
}
function displayDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    weekday: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00Z`))
}
function preferredLocale() {
  try {
    const saved = localStorage.getItem('lunar-todoist-locale')
    if (isLocale(saved))
      return saved
  }
  catch {}
  return localeFromLanguages(navigator.languages.length ? navigator.languages : [navigator.language])
}

interface ManagedTask {
  id: string
  index: number
  content: string
  description: string
  date: string
  dateType: 'date' | 'datetime' | 'deadline'
}
interface ManagedEvent {
  id: string
  title: string
  tasks: ManagedTask[]
  event: EventConfig
  known: Record<string, string>
}

export function Planner({
  connected,
  configured,
  editId,
  view = 'home',
}: {
  connected: boolean
  configured: boolean
  editId?: string
  view?: 'home' | 'create' | 'tasks' | 'edit'
}) {
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
  return ready
    ? (
        <PlannerForm connected={connected} configured={configured} editId={editId} view={view} />
      )
    : (
        <main className="p-6">Loading planner…</main>
      )
}
function load() {
  return {
    event: {
      id: crypto.randomUUID(),
      title: '',
      locale: 'en' as const,
      schedule: 'once' as const,
      dateType: 'date' as const,
      time: '09:00',
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
}
function PlannerForm({
  connected,
  configured,
  editId,
  view,
}: {
  connected: boolean
  configured: boolean
  editId?: string
  view: 'home' | 'create' | 'tasks' | 'edit'
}) {
  const [initial] = useState(load)
  const [initialLocale] = useState<Locale>(preferredLocale)
  const [event, setEvent] = useState<EventConfig>({ ...initial.event, locale: initialLocale })
  const [locale, setLocale] = useState<Locale>(initialLocale)
  const [known, setKnown] = useState<Record<string, string>>(initial.known)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [todoistPreviewOpen, setTodoistPreviewOpen] = useState(false)
  const [managedEvents, setManagedEvents] = useState<ManagedEvent[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)
  const [deletingEvent, setDeletingEvent] = useState<string | null>(null)
  const ready = true
  const c = (key: TranslationKey) => translate(locale, key)
  const lunar = lunarLabels(locale)
  useEffect(() => {
    document.documentElement.lang = locale
    try {
      localStorage.setItem('lunar-todoist-locale', locale)
    }
    catch {}
  }, [locale])
  async function loadManagedTasks() {
    if (!connected || (view !== 'tasks' && view !== 'edit'))
      return
    setTasksLoading(true)
    try {
      const response = await fetch('/api/tasks', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok)
        throw new Error(data.error)
      setManagedEvents(data.events)
      if (view === 'edit') {
        const group: ManagedEvent | undefined = data.events.find((item: ManagedEvent) => item.id === editId)
        if (!group)
          throw new Error(c('scheduleNotFound'))
        setEvent({ ...group.event, locale })
        setKnown(group.known)
      }
    }
    catch (e) {
      setStatus((e as Error).message)
    }
    finally {
      setTasksLoading(false)
    }
  }
  useEffect(() => {
    loadManagedTasks()
    // The connection state is the trigger; the loader intentionally stays local.
    // eslint-disable-next-line react/exhaustive-deps
  }, [connected, editId, view])
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
    setStatus(c('working'))
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
      setStatus(c('syncResult')
        .replace('{created}', String(data.created))
        .replace('{updated}', String(data.updated)))
      await loadManagedTasks()
    }
    catch (e) {
      setStatus((e as Error).message)
    }
    finally {
      setBusy(false)
    }
  }
  function applyDemo(input: Pick<EventConfig, 'title' | 'month' | 'day' | 'schedule'>) {
    setEvent({ ...event, ...input, id: crypto.randomUUID(), leap: false })
    setKnown({})
  }
  const editReady = view !== 'edit' || Object.keys(known).length > 0
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Primary">
        <Link className="flex items-center gap-3" href="/">
          <Image alt="Chinese Lunar Todoist" className="size-10" height={40} priority src="/chinese-lunar-todoist-logo.png" width={40} />
          <div>
            <p className="font-semibold tracking-tight">Chinese Lunar Todoist</p>
            <p className="text-xs text-muted-foreground">{c('brandSub')}</p>
          </div>
        </Link>
        <div className="order-3 flex w-full items-center gap-1 rounded-xl bg-muted/70 p-1 sm:order-none sm:w-auto">
          {([
            ['home', '/', c('navHome')],
            ['create', '/create', c('navCreate')],
            ['tasks', '/tasks', c('navTasks')],
          ] as const).map(([item, href, label]) => (
            <Link className={cn('flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors sm:flex-none', (view === item || (view === 'edit' && item === 'tasks')) ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground')} href={href} key={item}>
              {label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-xs sm:flex">
            <span className={cn('size-1.5 rounded-full', connected ? 'bg-emerald-500' : 'bg-muted-foreground/50')} />
            {connected ? c('connected') : c('connectHint')}
          </span>
          <select
            aria-label="Language"
            className="h-9 rounded-lg border bg-background px-2 text-xs"
            value={locale}
            onChange={(e) => {
              const next = e.target.value as Locale
              setLocale(next)
              setEvent(current => ({ ...current, locale: next }))
            }}
          >
            <option value="en">English</option>
            <option value="zh-CN">简体中文</option>
            <option value="zh-TW">繁體中文</option>
          </select>
          <ThemeToggle />
        </div>
      </nav>

      {view === 'home' && (
        <header className="max-w-3xl py-12 sm:py-20">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-primary shadow-xs">
            <Sparkles aria-hidden="true" className="size-3.5" />
            {c('badge')}
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.035em] text-balance sm:text-5xl lg:text-6xl">
            {c('heroA')}
            {' '}
            <span className="text-primary">{c('heroB')}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            {c('heroText')}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90" href="/create">{c('startCreating')}</Link>
            <Link className="inline-flex h-11 items-center justify-center rounded-lg border bg-background/70 px-5 text-sm font-medium shadow-xs hover:bg-accent" href="/tasks">{c('viewSchedules')}</Link>
          </div>
        </header>
      )}

      {view !== 'home' && (
        <header className="py-10 sm:py-12">
          <p className="text-sm font-medium text-primary">Chinese Lunar Todoist</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{view === 'create' ? c('createPageTitle') : view === 'edit' ? c('editPageTitle') : c('tasksPageTitle')}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{view === 'create' ? c('createPageText') : view === 'edit' ? c('editPageText') : c('tasksPageText')}</p>
        </header>
      )}

      {!configured && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-primary/20 bg-accent/60 p-4 text-sm text-accent-foreground">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>{c('oauthMissing')}</p>
        </div>
      )}

      {!connected && configured && view !== 'tasks' && (
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-primary/25 bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">{c('previewFeatures')}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{c('previewFeaturesText')}</p>
          </div>
          <a
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
            href="/api/auth/login"
          >
            <Link2 aria-hidden="true" className="size-4" />
            {c('connect')}
          </a>
        </div>
      )}

      {view === 'home' && (
        <section className="grid gap-4 pb-12 sm:grid-cols-3">
          {([['homeFeatureCreate', 'homeFeatureCreateText'], ['homeFeaturePreview', 'homeFeaturePreviewText'], ['homeFeatureManage', 'homeFeatureManageText']] as const).map(([title, text]) => (
            <Card key={title}>
              <CardHeader>
                <CardTitle>{c(title)}</CardTitle>
                <CardDescription>{c(text)}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>
      )}

      {view === 'create' && (
        <section className="mb-6" aria-labelledby="demo-heading">
          <div className="mb-3">
            <h2 className="text-lg font-semibold tracking-tight" id="demo-heading">{c('examples')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{c('examplesText')}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {([
              ['newYear', 1, 1, 'newYearDesc'],
              ['dragonBoat', 5, 5, 'dragonBoatDesc'],
              ['midAutumn', 8, 15, 'midAutumnDesc'],
            ] as const).map(([titleKey, month, day, descriptionKey]) => (
              <button
                className="rounded-xl border-2 border-primary/25 bg-background p-4 text-left shadow-xs transition-colors hover:border-primary hover:bg-accent/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
                key={titleKey}
                type="button"
                onClick={() => applyDemo({ title: c(titleKey), month, day, schedule: 'series' })}
              >
                <span className="block text-sm font-semibold">{c(titleKey)}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {c(descriptionKey)}
                  {' '}
                  ·
                  {' '}
                  {lunar.months[month - 1]}
                  {' '}
                  {lunar.days[day - 1]}
                </span>
                <span className="mt-3 block text-xs font-semibold text-primary">
                  {c('useExample')}
                  {' '}
                  →
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {(view === 'create' || (view === 'edit' && connected && editReady)) && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.82fr)]">
          <Card id="task-details-card">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{c('taskDetails')}</CardTitle>
                  <CardDescription>{Object.keys(known).length ? c('editingSchedule') : c('taskDetailsDesc')}</CardDescription>
                </div>
                {connected && (
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
                    <span className="hidden sm:inline">{c('disconnect')}</span>
                  </Button>
                )}
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
                  {c('taskName')}
                  <span className="text-xs leading-5 font-normal text-muted-foreground">{c('taskNameDesc')}</span>
                  <Input
                    aria-label={c('taskName')}
                    id="event-title"
                    value={event.title}
                    maxLength={200}
                    placeholder={c('taskPlaceholder')}
                    required
                    onChange={e => setEvent({ ...event, title: e.target.value })}
                  />
                </Label>
                <fieldset className="grid gap-2 sm:col-span-2">
                  <legend className="mb-1 text-sm font-medium">{c('schedule')}</legend>
                  <p className="text-xs leading-5 text-muted-foreground">{c('scheduleDesc')}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {([
                      ['once', c('once'), c('onceDesc')],
                      ['series', c('series'), c('seriesDesc')],
                    ] as const).map(([value, title, description]) => (
                      <label
                        className={cn(
                          'flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors',
                          event.schedule === value && 'border-primary/55 bg-accent/55',
                        )}
                        key={value}
                      >
                        <input
                          aria-label={title}
                          checked={event.schedule === value}
                          className="mt-1 size-4 accent-[var(--primary)]"
                          name="schedule"
                          type="radio"
                          value={value}
                          onChange={() => setEvent({ ...event, schedule: value })}
                        />
                        <span>
                          <span className="block text-sm font-medium">{title}</span>
                          <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                            {description}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="grid gap-2 sm:col-span-2">
                  <legend className="mb-1 text-sm font-medium">{c('dateType')}</legend>
                  <p className="text-xs leading-5 text-muted-foreground">{c('dateTypeDesc')}</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {([
                      ['date', c('dueDate'), c('dueDateDesc')],
                      ['datetime', c('dueTimeType'), c('dueTimeTypeDesc')],
                      ['deadline', c('deadline'), c('deadlineDesc')],
                    ] as const).map(([value, title, description]) => (
                      <label
                        className={cn(
                          'flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors',
                          event.dateType === value && 'border-primary/55 bg-accent/55',
                        )}
                        key={value}
                      >
                        <input
                          aria-label={value === 'date' ? c('dueDateAria') : title}
                          checked={event.dateType === value}
                          className="mt-1 size-4 accent-[var(--primary)]"
                          name="date-type"
                          type="radio"
                          value={value}
                          onChange={() => setEvent({ ...event, dateType: value })}
                        />
                        <span>
                          <span className="block text-sm font-medium">{title}</span>
                          <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                            {description}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="sm:col-span-2">
                  <span className="mb-2 block text-sm font-medium">{c('lunarDate')}</span>
                  <span className="mb-2 block text-xs leading-5 text-muted-foreground">{c('lunarDateDesc')}</span>
                  <Button
                    aria-expanded={calendarOpen}
                    className="w-full justify-between"
                    type="button"
                    variant="outline"
                    onClick={() => setCalendarOpen(value => !value)}
                  >
                    <span>
                      {lunar.months[event.month - 1]}
                      {' '}
                      ·
                      {' '}
                      {lunar.days[event.day - 1]}
                    </span>
                    <CalendarDays aria-hidden="true" className="size-4" />
                  </Button>
                  {calendarOpen && (
                    <div className="mt-3 rounded-xl border bg-background p-3 shadow-sm">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">{c('chooseMonth')}</p>
                      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                        {lunar.months.map((month, index) => (
                          <button
                            aria-pressed={event.month === index + 1}
                            className={cn('rounded-lg px-2 py-2 text-xs hover:bg-accent', event.month === index + 1 && 'bg-primary text-primary-foreground hover:bg-primary')}
                            key={month}
                            type="button"
                            onClick={() => setEvent({ ...event, month: index + 1 })}
                          >
                            {month}
                          </button>
                        ))}
                      </div>
                      <p className="mt-4 mb-2 text-xs font-medium text-muted-foreground">{c('chooseDay')}</p>
                      <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
                        {lunar.days.map((day, index) => (
                          <button
                            aria-pressed={event.day === index + 1}
                            className={cn('rounded-lg px-1 py-2 text-xs hover:bg-accent', event.day === index + 1 && 'bg-primary text-primary-foreground hover:bg-primary')}
                            key={day}
                            type="button"
                            onClick={() => setEvent({ ...event, day: index + 1 })}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {event.schedule === 'series' && (
                  <Label htmlFor="event-count">
                    {c('numberTasks')}
                    <span className="text-xs leading-5 font-normal text-muted-foreground">{c('numberTasksDesc')}</span>
                    <Input
                      aria-label={c('numberTasks')}
                      id="event-count"
                      max={20}
                      min={1}
                      type="number"
                      value={event.count}
                      onChange={e => setEvent({ ...event, count: Number(e.target.value) })}
                    />
                  </Label>
                )}
                <Label htmlFor="event-from">
                  {c('startFrom')}
                  <span className="text-xs leading-5 font-normal text-muted-foreground">{c('startFromDesc')}</span>
                  <Input
                    aria-label={c('startFrom')}
                    id="event-from"
                    type="date"
                    value={event.from}
                    onChange={e => setEvent({ ...event, from: e.target.value })}
                  />
                </Label>
                {event.dateType === 'datetime' && (
                  <Label htmlFor="event-time">
                    {c('dueTime')}
                    <span className="text-xs leading-5 font-normal text-muted-foreground">{c('dueTimeDesc')}</span>
                    <Input
                      aria-label={c('dueTime')}
                      id="event-time"
                      type="time"
                      value={event.time}
                      onChange={e => setEvent({ ...event, time: e.target.value })}
                    />
                  </Label>
                )}
                <fieldset className="grid gap-2 sm:col-span-2">
                  <legend className="mb-1 text-sm font-medium">{c('monthType')}</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className={cn('flex cursor-pointer gap-3 rounded-xl border p-3', !event.leap && 'border-primary/55 bg-accent/55')}>
                      <input
                        aria-label={c('regularMonth')}
                        checked={!event.leap}
                        className="mt-1 size-4 accent-[var(--primary)]"
                        name="lunar-month-type"
                        type="radio"
                        onChange={() => setEvent({ ...event, leap: false })}
                      />
                      <span>
                        <span className="block text-sm font-medium">{c('regularMonth')}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{c('regularMonthDesc')}</span>
                      </span>
                    </label>
                    <label className={cn('flex cursor-pointer gap-3 rounded-xl border p-3', event.leap && 'border-primary/55 bg-accent/55')}>
                      <input
                        aria-label={c('leapMonth')}
                        checked={event.leap}
                        className="mt-1 size-4 accent-[var(--primary)]"
                        name="lunar-month-type"
                        type="radio"
                        onChange={() => setEvent({ ...event, leap: true })}
                      />
                      <span>
                        <span className="block text-sm font-medium">{c('leapMonth')}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{c('leapMonthDesc')}</span>
                      </span>
                    </label>
                  </div>
                </fieldset>
                <div className="flex gap-2 text-xs leading-5 text-muted-foreground sm:col-span-2">
                  <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                  <p>{c('lunarSeriesNote')}</p>
                </div>
                {connected
                  ? (
                      <Button
                        className="sm:col-span-2"
                        type="submit"
                        disabled={!ready || busy || !!error || !dates.length || !event.title.trim()}
                      >
                        <CalendarDays aria-hidden="true" className="size-4" />
                        {busy
                          ? c('adding')
                          : Object.keys(known).length
                            ? event.schedule === 'once' ? c('updateTask') : c('updateSeries')
                            : event.schedule === 'once' ? c('addTask') : c('addSeries')}
                      </Button>
                    )
                  : configured
                    ? (
                        <a
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 sm:col-span-2"
                          href="/api/auth/login"
                        >
                          <Link2 aria-hidden="true" className="size-4" />
                          {c('connectAdd')}
                        </a>
                      )
                    : (
                        <Button className="sm:col-span-2" disabled type="button">
                          {c('unavailable')}
                        </Button>
                      )}
              </form>
            </CardContent>
          </Card>

          <Card className="lg:sticky lg:top-8">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>{c('datePreview')}</CardTitle>
                  <CardDescription>
                    {dates.length}
                    {' '}
                    {dates.length === 1 ? c('task') : c('tasks')}
                    {' '}
                    {c('ready')}
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
                            {displayDate(date, locale)}
                          </time>
                          <CheckCircle2 aria-hidden="true" className="ml-auto size-4 text-primary/65" />
                        </li>
                      ))}
                    </ol>
                  )}
              {ready && dates.length < event.count && !error && (
                <p className="mt-4 text-xs leading-5 text-muted-foreground">
                  {c('only')}
                  {' '}
                  {dates.length}
                  {' '}
                  {c('before2101')}
                </p>
              )}
              {!error && dates[0] && (
                <div className="mt-4 border-t pt-4">
                  <Button
                    className="w-full"
                    type="button"
                    variant="outline"
                    onClick={() => setTodoistPreviewOpen(value => !value)}
                  >
                    <Eye aria-hidden="true" className="size-4" />
                    {todoistPreviewOpen ? c('hidePreview') : c('showPreview')}
                  </Button>
                  <Dialog description={c('previewNotice')} open={todoistPreviewOpen} title={c('showPreview')} onClose={() => setTodoistPreviewOpen(false)}>
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 size-5 shrink-0 rounded-full border-2 border-red-500" />
                      <div className="min-w-0">
                        <p className="font-medium">{event.title || c('yourTask')}</p>
                        <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                          {event.dateType === 'deadline' ? c('deadline') : c('due')}
                          {' '}
                          ·
                          {displayDate(dates[0], locale)}
                          {event.dateType === 'datetime' ? ` · ${event.time}` : ''}
                        </p>
                        <p className="mt-3 whitespace-pre-line text-xs leading-5 text-muted-foreground">
                          {taskDescription(event, 0, locale).replace(/ · \[chinese-lunar-todoist:.*\]/, '')}
                        </p>
                      </div>
                    </div>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {view === 'edit' && connected && !editReady && (
        <Card className="mx-auto max-w-xl">
          <CardContent className="pt-6 text-sm text-muted-foreground">{status || c('loadingTasks')}</CardContent>
        </Card>
      )}

      {view === 'tasks' && connected && (
        <section className="mt-6" aria-labelledby="existing-tasks-heading">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle id="existing-tasks-heading">{c('existingTasks')}</CardTitle>
                  <CardDescription>{c('existingTasksDesc')}</CardDescription>
                </div>
                <Tooltip content={c('refreshTasks')}>
                  <Button aria-label={c('refreshTasks')} className="size-10 p-0" disabled={tasksLoading} type="button" variant="outline" onClick={loadManagedTasks}>
                    <RefreshCw aria-hidden="true" className={cn('size-4', tasksLoading && 'animate-spin')} />
                  </Button>
                </Tooltip>
              </div>
            </CardHeader>
            <CardContent>
              {tasksLoading && managedEvents.length === 0
                ? <p className="text-sm text-muted-foreground">{c('loadingTasks')}</p>
                : managedEvents.length === 0
                  ? <p className="text-sm text-muted-foreground">{c('noTasks')}</p>
                  : (
                      <ul className="grid gap-3">
                        {managedEvents.map(group => (
                          <li className="rounded-xl border bg-background/55 p-4" key={group.id}>
                            <div className="flex items-start gap-3">
                              <span className="mt-1 size-5 shrink-0 rounded-full border-2 border-red-500" />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium">{group.title}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {group.tasks.length}
                                  {' '}
                                  {group.tasks.length === 1 ? c('task') : c('tasks')}
                                  {' · '}
                                  {group.event.schedule === 'series' ? c('series') : c('once')}
                                </p>
                              </div>
                              <div className="flex shrink-0 gap-1">
                                <Tooltip content={c('previewTasks')}>
                                  <Button aria-label={c('previewTasks')} className="size-10 p-0" type="button" variant="ghost" onClick={() => setExpandedEvent(current => current === group.id ? null : group.id)}>
                                    <Eye aria-hidden="true" className="size-4" />
                                  </Button>
                                </Tooltip>
                                <Tooltip content={c('loadToEdit')}>
                                  <Link aria-label={c('loadToEdit')} className="inline-flex size-10 items-center justify-center rounded-lg hover:bg-accent hover:text-accent-foreground" href={`/tasks/${group.id}/edit`}>
                                    <Pencil aria-hidden="true" className="size-4" />
                                  </Link>
                                </Tooltip>
                                <Tooltip content={c('deleteSchedule')}>
                                  <Button aria-label={c('deleteSchedule')} className="size-10 p-0 text-red-600" type="button" variant="ghost" onClick={() => setDeletingEvent(group.id)}>
                                    <Trash2 aria-hidden="true" className="size-4" />
                                  </Button>
                                </Tooltip>
                              </div>
                            </div>
                            {expandedEvent === group.id && (
                              <ol className="mt-3 grid gap-2 border-t pt-3">
                                {group.tasks.map(task => (
                                  <li className="flex items-center gap-3 rounded-lg bg-muted/55 px-3 py-2" key={task.id}>
                                    <span className="text-xs font-medium text-muted-foreground">{task.index + 1}</span>
                                    <span className="min-w-0 flex-1 truncate text-sm">{task.content}</span>
                                    {task.date && <time className="text-xs text-muted-foreground" dateTime={task.date}>{displayDate(task.date.slice(0, 10), locale)}</time>}
                                  </li>
                                ))}
                              </ol>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
            </CardContent>
          </Card>
        </section>
      )}

      <Dialog description={c('deleteConfirm')} open={Boolean(deletingEvent)} title={c('deleteSchedule')} onClose={() => setDeletingEvent(null)}>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setDeletingEvent(null)}>{c('cancel')}</Button>
          <Button
            className="bg-red-600 text-white hover:bg-red-700"
            type="button"
            onClick={async () => {
              if (!deletingEvent)
                return
              const response = await fetch(`/api/tasks?eventId=${encodeURIComponent(deletingEvent)}`, { method: 'DELETE' })
              if (!response.ok) {
                const data = await response.json()
                setStatus(data.error)
                return
              }
              setManagedEvents(current => current.filter(item => item.id !== deletingEvent))
              setDeletingEvent(null)
              setStatus(c('taskDeleted'))
            }}
          >
            {c('deleteSchedule')}
          </Button>
        </div>
      </Dialog>

      {view === 'tasks' && !connected && (
        <Card className="mx-auto max-w-xl text-center">
          <CardHeader>
            <CardTitle>{c('connectToManage')}</CardTitle>
            <CardDescription>{c('connectToManageText')}</CardDescription>
          </CardHeader>
          <CardContent>
            {configured
              ? (
                  <a className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground" href="/api/auth/login">
                    <Link2 className="size-4" />
                    {c('connect')}
                  </a>
                )
              : <p className="text-sm text-muted-foreground">{c('oauthMissing')}</p>}
          </CardContent>
        </Card>
      )}

      {status && (
        <p className="mt-6 rounded-xl border bg-card p-4 text-sm shadow-xs" role="status">
          {status}
        </p>
      )}
      <footer className="mx-auto max-w-3xl py-10 text-center text-xs leading-5 text-muted-foreground">
        {c('footer')}
      </footer>
    </main>
  )
}
