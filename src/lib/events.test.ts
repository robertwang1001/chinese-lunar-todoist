import type { EventConfig } from './events'
import { describe, expect, it } from 'vitest'
import { occurrences, taskDescription, taskSchedule } from './events'

const event: EventConfig = {
  id: '9a18ccf0-bb2d-4f8d-bf9e-73db63c1a705',
  title: 'New year',
  locale: 'en',
  schedule: 'series',
  dateType: 'date',
  time: '09:00',
  month: 1,
  day: 1,
  leap: false,
  count: 3,
  from: '2024-01-01',
}
describe('lunar recurrence', () => {
  it('converts known lunar new years', () =>
    expect(occurrences(event)).toEqual([
      '2024-02-10',
      '2025-01-29',
      '2026-02-17',
    ]))
  it('includes the start date', () =>
    expect(occurrences({ ...event, from: '2024-02-10', count: 1 })).toEqual([
      '2024-02-10',
    ]))
  it('creates only the next date for a one-time task', () =>
    expect(occurrences({ ...event, schedule: 'once', count: 20 })).toEqual([
      '2024-02-10',
    ]))
  it('skips a leap month absent in a year', () =>
    expect(
      occurrences({
        ...event,
        month: 2,
        leap: true,
        count: 1,
        from: '2023-01-01',
      }),
    ).toEqual(['2023-03-22']))
  it('rejects invalid date and unbounded count', () => {
    expect(() => occurrences({ ...event, from: '2024-02-31' })).toThrow()
    expect(() => occurrences({ ...event, count: 1000 })).toThrow()
  })
  it('skips missing day 30', () => {
    const dates = occurrences({ ...event, month: 2, day: 30, count: 10 })
    expect(new Set(dates).size).toBe(10)
  })
  it('maps Todoist date types to their API fields', () => {
    expect(taskSchedule(event, '2026-02-17')).toEqual({
      due_date: '2026-02-17',
    })
    expect(
      taskSchedule({ ...event, dateType: 'datetime', time: '18:30' }, '2026-02-17'),
    ).toEqual({ due_datetime: '2026-02-17T18:30:00' })
    expect(
      taskSchedule({ ...event, dateType: 'deadline' }, '2026-02-17'),
    ).toEqual({ deadline_date: '2026-02-17' })
  })
  it('localizes generated Todoist descriptions', () => {
    expect(taskDescription({ ...event, locale: 'zh-CN' }, 0)).toContain('农历日期：1月1日')
    expect(taskDescription({ ...event, locale: 'zh-TW' }, 0)).toContain('農曆日期：1月1日')
  })
})
