import { z } from 'zod';
import { BENEFICIARY_VALUES } from './beneficiary';

export const fixedExpenseSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, 'Preencha o nome.').max(100),
  amount: z.number().min(0).max(999999999999.99).nullable(),
  variable: z.boolean(),
  due_day: z.number().int().min(1).max(31).nullable(),
  category: z.string().trim().max(100),
  beneficiary_type: z.enum(BENEFICIARY_VALUES),
});
export type FixedExpenseInput = z.infer<typeof fixedExpenseSchema>;

/** Date of a fixed expense in a month (YYYY-MM): its due day, clamped to the month's last day, or the 1st. */
export function fixedExpenseDate(month: string, dueDay: number | null) {
  const [y = 0, m = 1] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const day = Math.min(dueDay ?? 1, last);
  return `${month}-${String(day).padStart(2, '0')}`;
}

/** Which fixed expenses can be launched: not yet launched this month and with a known amount (typed now or saved). */
export function launchPlan<T extends { id: string; amount: number | null }>(items: T[], launchedIds: string[], amounts: Record<string, number | null | undefined>) {
  return items.flatMap(item => {
    if (launchedIds.includes(item.id)) return [];
    const amount = amounts[item.id] ?? item.amount;
    return amount != null && amount > 0 ? [{ item, amount: Math.round(amount * 100) / 100 }] : [];
  });
}
