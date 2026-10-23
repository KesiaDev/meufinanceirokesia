import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { allocation, beneficiaryInput, SUGGESTED_CATEGORIES } from './beneficiary';

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

export const createSuggestedCategories = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: existing, error } = await context.supabase.from('expense_categories').select('name').eq('user_id', context.userId);
    if (error) return { ok: false as const, error: 'Não foi possível carregar suas categorias.' };
    const taken = new Set(existing.map(c => c.name.trim().toLowerCase()));
    const missing = SUGGESTED_CATEGORIES.filter(name => !taken.has(name.toLowerCase()));
    if (!missing.length) return { ok: true as const, created: 0 };
    const { error: insertError } = await context.supabase.from('expense_categories').insert(missing.map(name => ({ name, user_id: context.userId })));
    return insertError ? { ok: false as const, error: 'Não foi possível criar as categorias sugeridas.' } : { ok: true as const, created: missing.length };
  });

export const classifyBeneficiary = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), beneficiary: beneficiaryInput }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: expense, error } = await context.supabase.from('expenses').select('total_amount').eq('id', data.id).eq('user_id', context.userId).maybeSingle();
    if (error || !expense) return { ok: false as const, error: 'Despesa não encontrada.' };
    const { data: updated, error: updateError } = await context.supabase.from('expenses')
      .update(allocation(data.beneficiary.type, Number(expense.total_amount), data.beneficiary.percentage)).eq('id', data.id).eq('user_id', context.userId).select('id').maybeSingle();
    return updateError || !updated ? { ok: false as const, error: 'Não foi possível classificar a despesa.' } : { ok: true as const };
  });
