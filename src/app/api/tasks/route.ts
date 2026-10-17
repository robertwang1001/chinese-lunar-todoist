import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eventSchema, marker, occurrences, taskDescription, taskSchedule } from '@/lib/events'
import { origin, token } from '@/lib/session'

const schema = z.object({
  event: eventSchema,
  known: z
    .record(
      z.string().regex(/^\d{1,2}$/),
      z.string().regex(/^[\w-]{1,100}$/),
    )
    .refine(v => Object.keys(v).length <= 20),
})
const managedMarker = /\[chinese-lunar-todoist:[0-9a-f-]{36}:\d+\]/i
const editSchema = z.object({
  id: z.string().regex(/^[\w-]{1,100}$/),
  content: z.string().trim().min(1).max(200),
})
const deleteSchema = z.object({ id: z.string().regex(/^[\w-]{1,100}$/) })
const deleteEventSchema = z.object({ eventId: z.string().uuid() })
const api = 'https://api.todoist.com/api/v1'

function todoistHeaders(accessToken: string) {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
}

async function managedTask(id: string, accessToken: string) {
  const response = await fetch(`${api}/tasks/${encodeURIComponent(id)}`, {
    headers: todoistHeaders(accessToken),
    cache: 'no-store',
  })
  if (!response.ok)
    return null
  const task: { id: string, description?: string } = await response.json()
  return managedMarker.test(task.description || '') ? task : null
}

export async function GET() {
  const accessToken = await token()
  if (!accessToken)
    return NextResponse.json({ error: 'Connect Todoist first.' }, { status: 401 })
  try {
    const tasks: Array<{
      id: string
      content: string
      description?: string
      due?: { date?: string, datetime?: string }
      deadline?: { date?: string }
    }> = []
    let cursor: string | null = null
    do {
      const response: Response = await fetch(
        `${api}/tasks${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
        { headers: todoistHeaders(accessToken), cache: 'no-store' },
      )
      if (!response.ok)
        throw new Error('Unable to read Todoist tasks.')
      const data: { results: typeof tasks, next_cursor: string | null } = await response.json()
      tasks.push(...data.results)
      cursor = data.next_cursor
    } while (cursor)
    const grouped = new Map<string, Array<{
      id: string
      index: number
      content: string
      description: string
      date: string
      dateType: 'date' | 'datetime' | 'deadline'
    }>>()
    for (const task of tasks) {
      const match = task.description?.match(/\[chinese-lunar-todoist:([0-9a-f-]{36}):(\d+)\]/i)
      if (!match)
        continue
      const item = {
        id: task.id,
        index: Number(match[2]),
        content: task.content,
        description: (task.description || '').replace(/\n?[^\n]* · \[chinese-lunar-todoist:.*?\]/, ''),
        date: task.deadline?.date || task.due?.datetime || task.due?.date || '',
        dateType: (task.deadline?.date ? 'deadline' : task.due?.datetime ? 'datetime' : 'date') as 'date' | 'datetime' | 'deadline',
      }
      grouped.set(match[1], [...(grouped.get(match[1]) || []), item])
    }
    const events = [...grouped.entries()].map(([id, items]) => {
      items.sort((a, b) => a.index - b.index)
      const description = items[0].description
      const english = description.match(/Lunar date: (leap )?month (\d+), day (\d+)/i)
      const chinese = description.match(/[农農][历歷]日期[：:]([闰閏])?(\d+)月(\d+)日/)
      const locale = description.includes('農曆') ? 'zh-TW' : description.includes('农历') ? 'zh-CN' : 'en'
      const firstDate = items[0].date.slice(0, 10)
      return {
        id,
        title: items[0].content,
        tasks: items,
        event: {
          id,
          title: items[0].content,
          locale,
          schedule: items.length > 1 ? 'series' : 'once',
          dateType: items[0].dateType,
          time: items[0].date.includes('T') ? items[0].date.slice(11, 16) : '09:00',
          month: Number(english?.[2] || chinese?.[2] || 1),
          day: Number(english?.[3] || chinese?.[3] || 1),
          leap: Boolean(english?.[1] || chinese?.[1]),
          count: Math.max(...items.map(item => item.index)) + 1,
          from: firstDate,
        },
        known: Object.fromEntries(items.map(item => [item.index, item.id])),
      }
    })
    return NextResponse.json({ events })
  }
  catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Todoist request failed.' }, { status: 502 })
  }
}

export async function PATCH(req: NextRequest) {
  if (req.headers.get('origin') !== origin())
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const accessToken = await token()
  if (!accessToken)
    return NextResponse.json({ error: 'Connect Todoist first.' }, { status: 401 })
  try {
    const input = editSchema.parse(await req.json())
    if (!await managedTask(input.id, accessToken))
      return NextResponse.json({ error: 'Lunar task not found.' }, { status: 404 })
    const response = await fetch(`${api}/tasks/${encodeURIComponent(input.id)}`, {
      method: 'POST',
      headers: todoistHeaders(accessToken),
      body: JSON.stringify({ content: input.content }),
    })
    if (!response.ok)
      throw new Error('Todoist rejected the update.')
    return NextResponse.json({ task: await response.json() })
  }
  catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: 'Invalid task update.' }, { status: 400 })
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Todoist request failed.' }, { status: 502 })
  }
}

export async function DELETE(req: NextRequest) {
  if (req.headers.get('origin') !== origin())
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const accessToken = await token()
  if (!accessToken)
    return NextResponse.json({ error: 'Connect Todoist first.' }, { status: 401 })
  try {
    if (req.nextUrl.searchParams.has('eventId')) {
      const { eventId } = deleteEventSchema.parse(Object.fromEntries(req.nextUrl.searchParams))
      const tasks: Array<{ id: string, description?: string }> = []
      let cursor: string | null = null
      do {
        const response: Response = await fetch(`${api}/tasks${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, {
          headers: todoistHeaders(accessToken),
          cache: 'no-store',
        })
        if (!response.ok)
          throw new Error('Unable to read Todoist tasks.')
        const data: { results: typeof tasks, next_cursor: string | null } = await response.json()
        tasks.push(...data.results)
        cursor = data.next_cursor
      } while (cursor)
      const related = tasks.filter(task => task.description?.includes(`[chinese-lunar-todoist:${eventId}:`))
      await Promise.all(related.map(async (task) => {
        const deleted = await fetch(`${api}/tasks/${encodeURIComponent(task.id)}`, {
          method: 'DELETE',
          headers: todoistHeaders(accessToken),
        })
        if (!deleted.ok)
          throw new Error('Todoist rejected the deletion.')
      }))
      return NextResponse.json({ deleted: related.length })
    }
    const input = deleteSchema.parse(Object.fromEntries(req.nextUrl.searchParams))
    if (!await managedTask(input.id, accessToken))
      return NextResponse.json({ error: 'Lunar task not found.' }, { status: 404 })
    const response = await fetch(`${api}/tasks/${encodeURIComponent(input.id)}`, {
      method: 'DELETE',
      headers: todoistHeaders(accessToken),
    })
    if (!response.ok)
      throw new Error('Todoist rejected the deletion.')
    return new NextResponse(null, { status: 204 })
  }
  catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: 'Invalid task.' }, { status: 400 })
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Todoist request failed.' }, { status: 502 })
  }
}

export async function POST(req: NextRequest) {
  if (req.headers.get('origin') !== origin())
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const accessToken = await token()
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Connect Todoist first.' },
      { status: 401 },
    )
  }
  let input
  try {
    input = schema.parse(await req.json())
    if (!input.event.title)
      throw new Error('Task name is required.')
    occurrences(input.event)
  }
  catch {
    return NextResponse.json(
      { error: 'Invalid event settings.' },
      { status: 400 },
    )
  }
  const { event } = input
  const known = { ...input.known }
  let created = 0
  let updated = 0
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
  try {
    const tasks: { id: string, description: string, is_completed?: boolean }[]
      = []
    let cursor: string | null = null
    do {
      const r: Response = await fetch(
        `${api}/tasks${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
        { headers, cache: 'no-store' },
      )
      if (!r.ok) {
        throw new Error(
          'Unable to read active tasks. Reconnect if authorization expired.',
        )
      }
      const data: { results: typeof tasks, next_cursor: string | null }
        = await r.json()
      tasks.push(...data.results)
      cursor = data.next_cursor
    } while (cursor)
    const dates = occurrences(event)
    for (let i = 0; i < dates.length; i++) {
      const tag = marker(event, i)
      const existing = tasks.find(t =>
        known[i] ? t.id === known[i] : t.description?.includes(tag),
      )
      // Known IDs missing from the active list are completed or deleted: never recreate them.
      if ((known[i] && !existing) || existing?.is_completed)
        continue
      if (existing)
        known[i] = existing.id
      const description = existing
        ? existing.description
        : taskDescription(event, i)
      const body = {
        content: event.title,
        description,
        ...taskSchedule(event, dates[i]),
      }
      const requestId = existing
        ? crypto.randomUUID()
        : event.id.slice(0, 24) + String(i).padStart(12, '0')
      const r = await fetch(
        `${api}/tasks${existing ? `/${encodeURIComponent(existing.id)}` : ''}`,
        {
          method: 'POST',
          headers: { ...headers, 'X-Request-Id': requestId },
          body: JSON.stringify(body),
        },
      )
      if (!r.ok) {
        throw new Error(
          'Todoist rejected a task. Earlier tasks may have succeeded; retry to finish.',
        )
      }
      const result = await r.json()
      known[i] = result.id
      if (existing)
        updated++
      else created++
    }
    return NextResponse.json({ created, updated, known })
  }
  catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Todoist request failed.',
        known,
        created,
        updated,
      },
      { status: 502 },
    )
  }
}
