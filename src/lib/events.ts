import { Lunar } from "lunar-typescript";
import { z } from "zod";
export const eventSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(30),
  leap: z.boolean(),
  count: z.number().int().min(1).max(20),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type EventConfig = z.infer<typeof eventSchema>;
export function occurrences(input: EventConfig) {
  const e = eventSchema.parse(input);
  const start = new Date(`${e.from}T00:00:00Z`);
  const year = start.getUTCFullYear();
  if (
    !Number.isFinite(start.getTime()) ||
    start.toISOString().slice(0, 10) !== e.from ||
    year < 1901 ||
    year > 2079
  )
    throw new Error("Use a valid date between 1901 and 2079.");
  const dates: string[] = [];
  for (let y = year - 1; y <= 2100 && dates.length < e.count; y++) {
    try {
      const lunar = Lunar.fromYmd(y, e.leap ? -e.month : e.month, e.day);
      const date = lunar.getSolar().toYmd();
      if (
        lunar.getMonth() === (e.leap ? -e.month : e.month) &&
        lunar.getDay() === e.day &&
        date >= e.from
      )
        dates.push(date);
    } catch {
      /* Missing leap month or day 30: skip this year. */
    }
  }
  return dates;
}
export function marker(e: EventConfig, index: number) {
  return `[chinese-lunar-todoist:${e.id}:${index}]`;
}
