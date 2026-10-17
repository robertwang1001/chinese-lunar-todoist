import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eventSchema, marker, occurrences } from '@/lib/events'
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
  const api = 'https://api.todoist.com/api/v1'
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
        : `${tag}\nStatic lunar occurrence; refresh manually.`
      const body = { content: event.title, due_date: dates[i], description }
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
