import { z } from 'zod';
import { BENEFICIARY_VALUES } from './beneficiary';

export type FixedFrequency = 'Mensal' | 'Semanal';
export const FREQUENCIES: FixedFrequency[] = ['Mensal', 'Semanal'];
export const FREQUENCY_VALUES = FREQUENCIES as [FixedFrequency, ...FixedFrequency[]];
export const WEEKDAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

export const fixedExpenseSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, 'Preencha o nome.').max(100),
  amount: z.number().min(0).max(999999999999.99).nullable(),
  variable: z.boolean(),
  due_day: z.number().int().min(1).max(31).nullable(),
  category: z.string().trim().max(100),
  beneficiary_type: z.enum(BENEFICIARY_VALUES),
  frequency: z.enum(FREQUENCY_VALUES).default('Mensal'),
  weekday: z.number().int().min(0).max(6).nullable(),
}).superRefine((value, ctx) => {
  if (value.frequency === 'Semanal' && value.weekday == null) ctx.addIssue({ code: 'custom', path: ['weekday'], message: 'Escolha o dia da semana.' });
});
export type FixedExpenseInput = z.infer<typeof fixedExpenseSchema>;

/** Date of a monthly fixed expense in a month (YYYY-MM): its due day, clamped to the month's last day, or the 1st. */
export function fixedExpenseDate(month: string, dueDay: number | null) {
  const [y = 0, m = 1] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const day = Math.min(dueDay ?? 1, last);
  return `${month}-${String(day).padStart(2, '0')}`;
}

/** Every charge date of a fixed expense in a month (YYYY-MM): one per week for weekly ones, otherwise the due day. */
export function fixedExpenseDates(month: string, item: { frequency?: string | null; weekday?: number | null; due_day?: number | null }) {
  if (item.frequency !== 'Semanal') return [fixedExpenseDate(month, item.due_day ?? null)];
  const [y = 0, m = 1] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const weekday = item.weekday ?? 0;
  const dates: string[] = [];
  for (let day = 1; day <= last; day++) if (new Date(Date.UTC(y, m - 1, day)).getUTCDay() === weekday) dates.push(`${month}-${String(day).padStart(2, '0')}`);
  return dates;
}

export const launchedKey = (id: string, date: string) => `${id}|${date}`;

/** Which charges can still be launched: known amount and not yet launched on that date this month. */
export function launchPlan<T extends { id: string; amount: number | null; frequency?: string | null; weekday?: number | null; due_day?: number | null }>(
  month: string, items: T[], launchedKeys: string[], amounts: Record<string, number | null | undefined>,
) {
  return items.flatMap(item => {
    const amount = amounts[item.id] ?? item.amount;
    if (amount == null || amount <= 0) return [];
    const value = Math.round(amount * 100) / 100;
    return fixedExpenseDates(month, item)
      .filter(date => !launchedKeys.includes(launchedKey(item.id, date)))
      .map(date => ({ item, amount: value, date }));
  });
}
