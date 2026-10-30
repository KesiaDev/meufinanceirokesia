import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const incomeSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  amount: z.number().min(0).max(999999999999.99),
  due_day: z.number().int().min(1).max(31).nullable(),
});

export const saveIncome = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => incomeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context; const { id, ...row } = data;
    const result = id
      ? await supabase.from('incomes').update(row).eq('id', id).eq('user_id', userId).select('id').maybeSingle()
      : await supabase.from('incomes').insert({ ...row, user_id: userId }).select('id').single();
    return result.error || !result.data ? { ok: false as const, error: 'Não foi possível salvar o ganho.' } : { ok: true as const };
  });

export const deleteIncome = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from('incomes').delete().eq('id', data.id).eq('user_id', context.userId);
    return error ? { ok: false as const, error: 'Não foi possível excluir.' } : { ok: true as const };
  });
