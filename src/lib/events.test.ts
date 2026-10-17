import type { EventConfig } from './events'
import { describe, expect, it } from 'vitest'
import { occurrences } from './events'

const event: EventConfig = {
  id: '9a18ccf0-bb2d-4f8d-bf9e-73db63c1a705',
  title: 'New year',
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
})
