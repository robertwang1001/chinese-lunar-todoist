import type { Locale } from './i18n'
import { Lunar } from 'lunar-typescript'
import { z } from 'zod'

export const eventSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().max(200),
  locale: z.enum(['en', 'zh-CN', 'zh-TW']).default('en'),
  schedule: z.enum(['once', 'series']).default('series'),
  dateType: z.enum(['date', 'datetime', 'deadline']).default('date'),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default('09:00'),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(30),
  leap: z.boolean(),
  count: z.number().int().min(1).max(20),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})
export type EventConfig = z.infer<typeof eventSchema>
export function occurrences(input: EventConfig) {
  const e = eventSchema.parse(input)
  const start = new Date(`${e.from}T00:00:00Z`)
  const year = start.getUTCFullYear()
  if (
    !Number.isFinite(start.getTime())
    || start.toISOString().slice(0, 10) !== e.from
    || year < 1901
    || year > 2079
  ) {
    throw new Error('Use a valid date between 1901 and 2079.')
  }
  const dates: string[] = []
  const count = e.schedule === 'once' ? 1 : e.count
  for (let y = year - 1; y <= 2100 && dates.length < count; y++) {
    try {
      const lunar = Lunar.fromYmd(y, e.leap ? -e.month : e.month, e.day)
      const date = lunar.getSolar().toYmd()
      if (
        lunar.getMonth() === (e.leap ? -e.month : e.month)
        && lunar.getDay() === e.day
        && date >= e.from
      ) {
        dates.push(date)
      }
    }
    catch {
      /* Missing leap month or day 30: skip this year. */
    }
  }
  return dates
}
export function marker(e: EventConfig, index: number) {
  return `[chinese-lunar-todoist:${e.id}:${index}]`
}

export function taskDescription(e: EventConfig, index: number, locale: Locale = e.locale) {
  const month = locale === 'en'
    ? `${e.leap ? 'leap ' : ''}month ${e.month}`
    : `${e.leap ? locale === 'zh-TW' ? '閏' : '闰' : ''}${e.month}月`
  const schedule = locale === 'en'
    ? e.schedule === 'once' ? 'One-time lunar task' : `Occurrence ${index + 1} of ${e.count} for this yearly lunar task`
    : e.schedule === 'once' ? locale === 'zh-TW' ? '單次農曆任務' : '单次农历任务' : locale === 'zh-TW' ? `此年度農曆任務的第 ${index + 1} 次，共 ${e.count} 次` : `此年度农历任务的第 ${index + 1} 次，共 ${e.count} 次`
  return [
    locale === 'en' ? `Lunar date: ${month}, day ${e.day}` : `${locale === 'zh-TW' ? '農曆日期' : '农历日期'}：${month}${e.day}日`,
    schedule,
    '',
    `${locale === 'en' ? 'Created by Chinese Lunar Todoist' : locale === 'zh-TW' ? '由 Chinese Lunar Todoist 建立' : '由 Chinese Lunar Todoist 创建'} · ${marker(e, index)}`,
  ].join('\n')
}

export function taskSchedule(e: EventConfig, date: string) {
  if (e.dateType === 'datetime')
    return { due_datetime: `${date}T${e.time}:00` }
  if (e.dateType === 'deadline')
    return { deadline_date: date }
  return { due_date: date }
}
