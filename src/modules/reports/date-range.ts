import { z } from 'zod';
import type { ReportDateRange } from './types';

function getBogotaDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDate(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function getDefaultReportDateRange(now = new Date()): ReportDateRange {
  const today = getBogotaDate(now);
  return { from: shiftDate(today, -29), to: today };
}

export function getQuickReportDateRange(
  period: 'today' | '7days' | '30days' | 'month',
  now = new Date(),
): ReportDateRange {
  const today = getBogotaDate(now);
  if (period === 'today') return { from: today, to: today };
  if (period === 'month') return { from: `${today.slice(0, 7)}-01`, to: today };
  return { from: shiftDate(today, period === '7days' ? -6 : -29), to: today };
}

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa una fecha válida.')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Usa una fecha válida.');

export const reportDateRangeSchema = z
  .object({
    from: dateSchema.optional(),
    to: dateSchema.optional(),
  })
  .superRefine((range, context) => {
    if ((range.from === undefined) !== (range.to === undefined)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [range.from ? 'to' : 'from'],
        message: 'Selecciona las dos fechas del rango.',
      });
    }

    if (range.from && range.to && range.from > range.to) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['from'],
        message: 'La fecha desde no puede ser posterior a la fecha hasta.',
      });
    }
  })
  .transform((range) => {
    if (range.from && range.to) return { from: range.from, to: range.to };
    return getDefaultReportDateRange();
  });

export const reportProductSchema = z.object({
  id: z.string().min(1),
  code: z.string(),
  name: z.string(),
  size: z.string(),
  color: z.string(),
  active: z.boolean(),
  unitsSold: z.number().int().nonnegative().refine(Number.isSafeInteger),
  totalSold: z.number().int().nonnegative().refine(Number.isSafeInteger),
}).strict();

export const productSalesReportSourceSchema = z.object({
  salesCount: z.number().int().nonnegative().refine(Number.isSafeInteger),
  products: z.array(reportProductSchema),
});

export const productSalesReportSchema = z.object({
  summary: z.object({
    unitsSold: z.number().int().nonnegative().refine(Number.isSafeInteger),
    totalSold: z.number().int().nonnegative().refine(Number.isSafeInteger),
    salesCount: z.number().int().nonnegative().refine(Number.isSafeInteger),
  }),
  mostSold: z.array(reportProductSchema),
  leastSold: z.array(reportProductSchema),
});

export type ParsedReportDateRange = z.infer<typeof reportDateRangeSchema>;
