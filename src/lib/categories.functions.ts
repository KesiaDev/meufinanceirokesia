import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const createCategory = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ name: z.string().trim().min(1).max(100) }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from('expense_categories').insert({ name: data.name, user_id: context.userId });
    if (error) return { ok: false as const, error: error.code === '23505' ? 'Esta categoria já existe.' : 'Não foi possível criar a categoria.' };
    return { ok: true as const };
  });

export const classifyExpense = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), category: z.string().max(100) }).parse(input))
  .handler(async ({ data, context }) => {
    if (data.category) {
      const { data: category, error } = await context.supabase.from('expense_categories').select('id').eq('user_id', context.userId).eq('name', data.category).maybeSingle();
      if (error || !category) return { ok: false as const, error: 'Selecione uma categoria da sua conta.' };
    }
    const { data: updated, error } = await context.supabase.from('expenses').update({ category: data.category || null }).eq('id', data.id).eq('user_id', context.userId).select('id').maybeSingle();
    return error || !updated ? { ok: false as const, error: 'Não foi possível classificar a despesa.' } : { ok: true as const };
  });