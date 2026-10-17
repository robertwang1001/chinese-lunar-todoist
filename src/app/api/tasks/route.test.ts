import { NextRequest } from 'next/server'
// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { token } from '@/lib/session'
import { DELETE, GET, PATCH, POST } from './route'

vi.mock('@/lib/session', () => ({
  origin: () => 'http://localhost:3000',
  token: vi.fn(async () => 'test-token'),
}))

const event = {
  id: '9a18ccf0-bb2d-4f8d-bf9e-73db63c1a705',
  title: 'New year',
  locale: 'en' as const,
  schedule: 'once' as const,
  dateType: 'date' as const,
  time: '09:00',
  month: 1,
  day: 1,
  leap: false,
  count: 1,
  from: '2024-01-01',
}
function request(known = {}, origin = 'http://localhost:3000') {
  return new NextRequest('http://localhost:3000/api/tasks', {
    method: 'POST',
    headers: { origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, known }),
  })
}
beforeEach(() => {
  vi.restoreAllMocks()
  vi.mocked(token).mockResolvedValue('test-token')
})
it('rejects cross-origin requests before fetching', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch')
  expect((await POST(request({}, 'https://evil.example'))).status).toBe(403)
  expect(fetch).not.toHaveBeenCalled()
})
it('requires an OAuth session', async () => {
  vi.mocked(token).mockResolvedValue(null)
  expect((await POST(request())).status).toBe(401)
})
it('rejects an empty task name after trimming', async () => {
  const invalid = new NextRequest('http://localhost:3000/api/tasks', {
    method: 'POST',
    headers: { 'origin': 'http://localhost:3000', 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: { ...event, title: '   ' }, known: {} }),
  })
  expect((await POST(invalid)).status).toBe(400)
})
it('does not recreate a known completed or removed task', async () => {
  const fetch = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(Response.json({ results: [], next_cursor: null }))
  const response = await POST(request({ 0: 'old-task' }))
  expect(await response.json()).toMatchObject({ created: 0, updated: 0 })
  expect(fetch).toHaveBeenCalledTimes(1)
})
it('creates a non-recurring date and returns its ID', async () => {
  const fetch = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ results: [], next_cursor: null }))
    .mockResolvedValueOnce(Response.json({ id: 'new-task' }))
  const response = await POST(request())
  expect(await response.json()).toMatchObject({
    created: 1,
    known: { 0: 'new-task' },
  })
  const payload = JSON.parse(fetch.mock.calls[1][1]!.body as string)
  expect(payload.due_date).toBe('2024-02-10')
  expect(payload.due_string).toBeUndefined()
  expect(payload.description).toContain('Lunar date: month 1, day 1')
  expect(payload.description).toContain('One-time lunar task')
})
it('updates an unfinished task found on a later page', async () => {
  const fetch = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ results: [], next_cursor: 'page2' }))
    .mockResolvedValueOnce(
      Response.json({
        results: [
          { id: 'old-task', description: 'Keep notes', is_completed: false },
        ],
        next_cursor: null,
      }),
    )
    .mockResolvedValueOnce(Response.json({ id: 'old-task' }))
  const response = await POST(request({ 0: 'old-task' }))
  expect(await response.json()).toMatchObject({ created: 0, updated: 1 })
  expect(JSON.parse(fetch.mock.calls[2][1]!.body as string).description).toBe(
    'Keep notes',
  )
})
it('lists only active tasks created by this app', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
    results: [
      {
        id: 'lunar-task',
        content: 'Mom birthday',
        description: 'Lunar date: month 8, day 15\n\nCreated by Chinese Lunar Todoist · [chinese-lunar-todoist:9a18ccf0-bb2d-4f8d-bf9e-73db63c1a705:0]',
        due: { date: '2026-09-25' },
      },
      { id: 'normal-task', content: 'Unrelated', description: '' },
    ],
    next_cursor: null,
  }))
  expect(await (await GET()).json()).toMatchObject({
    events: [{
      id: event.id,
      title: 'Mom birthday',
      event: { month: 8, day: 15, schedule: 'once' },
      known: { 0: 'lunar-task' },
      tasks: [{ id: 'lunar-task', index: 0, date: '2026-09-25' }],
    }],
  })
})
it('renames a verified lunar task', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({
      id: 'lunar-task',
      description: '[chinese-lunar-todoist:9a18ccf0-bb2d-4f8d-bf9e-73db63c1a705:0]',
    }))
    .mockResolvedValueOnce(Response.json({ id: 'lunar-task', content: 'New title' }))
  const response = await PATCH(new NextRequest('http://localhost:3000/api/tasks', {
    method: 'PATCH',
    headers: { 'origin': 'http://localhost:3000', 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'lunar-task', content: 'New title' }),
  }))
  expect(response.status).toBe(200)
  expect(JSON.parse(fetch.mock.calls[1][1]!.body as string)).toEqual({ content: 'New title' })
})
it('refuses to delete a task without the app marker', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ id: 'normal-task', description: '' }))
  const response = await DELETE(new NextRequest('http://localhost:3000/api/tasks?id=normal-task', {
    method: 'DELETE',
    headers: { origin: 'http://localhost:3000' },
  }))
  expect(response.status).toBe(404)
})
