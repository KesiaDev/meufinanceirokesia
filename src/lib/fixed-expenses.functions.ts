import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { allocation } from './beneficiary';
import { fixedExpenseSchema, launchedKey, launchPlan } from './fixed-expenses';

export const saveFixedExpense = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => fixedExpenseSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context; const { id, ...row } = data;
    const values = { ...row, category: row.category || null, user_id: userId };
    const result = id
      ? await supabase.from('fixed_expenses').update(values).eq('id', id).eq('user_id', userId).select('id').maybeSingle()
      : await supabase.from('fixed_expenses').insert(values).select('id').single();
    return result.error || !result.data ? { ok: false as const, error: 'Não foi possível salvar a despesa fixa.' } : { ok: true as const };
  });

export const deleteFixedExpense = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from('fixed_expenses').delete().eq('id', data.id).eq('user_id', context.userId);
    return error ? { ok: false as const, error: 'Não foi possível excluir.' } : { ok: true as const };
  });

export const launchFixedExpenses = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), amounts: z.record(z.string().uuid(), z.number().min(0).max(999999999999.99).nullable()) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [items, launched, pending] = await Promise.all([
      supabase.from('fixed_expenses').select('*').eq('user_id', userId),
      supabase.from('expenses').select('fixed_expense_id, expense_date').eq('user_id', userId).eq('reference_month', data.month).not('fixed_expense_id', 'is', null),
      supabase.from('expenses').select('id, fixed_expense_id, expense_date').eq('user_id', userId).eq('reference_month', data.month).eq('payment_status', 'Pendente').not('fixed_expense_id', 'is', null),
    ]);
    if (items.error || launched.error || pending.error) return { ok: false as const, error: 'Não foi possível carregar as despesas fixas.' };
    const plan = launchPlan(data.month, items.data.map(i => ({ ...i, amount: i.amount == null ? null : Number(i.amount) })), launched.data.map(l => launchedKey(l.fixed_expense_id!, l.expense_date)), data.amounts);
    const { moves, inserts } = pendingMoves(plan, pending.data);
    const rows = inserts.map(({ item, amount, date }) => ({
      user_id: userId, fixed_expense_id: item.id, reference_month: data.month, description: item.name, category: item.category,
      expense_date: date, due_date: date, total_amount: amount, payment_status: 'Pendente', paid_amount: 0,
      ...allocation(item.beneficiary_type as Parameters<typeof allocation>[0], amount, 50),
    }));
    const [moveResults, insertResult] = await Promise.all([
      Promise.all(moves.map(({ row, amount, date }) => supabase.from('expenses').update({ expense_date: date, due_date: date, total_amount: amount }).eq('id', row.id).eq('user_id', userId))),
      rows.length ? supabase.from('expenses').insert(rows) : Promise.resolve({ error: null }),
    ]);
    const failed = moveResults.find(r => r.error) ?? insertResult;
    return failed.error ? { ok: false as const, error: 'Não foi possível lançar (talvez já tenham sido lançadas neste mês).' } : { ok: true as const, created: moves.length + rows.length };
  });
