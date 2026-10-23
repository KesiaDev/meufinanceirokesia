import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { allocation, UNCLASSIFIED } from './beneficiary';
import { isDocumentDate } from './document-review';
import { expenseEditSchema, paidAmountFor } from './expense-edit';

export const updateExpense = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), expense: expenseEditSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context; const e = data.expense;
    if (e.category) {
      const { data: category, error } = await supabase.from('expense_categories').select('id').eq('user_id', userId).eq('name', e.category).maybeSingle();
      if (error || !category) return { ok: false as const, error: 'Selecione uma categoria da sua conta.' };
    }
    if (e.due_date && !isDocumentDate(e.due_date)) return { ok: false as const, error: 'Vencimento inválido.' };
    const split = e.beneficiary ? allocation(e.beneficiary.type, e.total_amount, e.beneficiary.percentage) : { beneficiary_type: UNCLASSIFIED, allocation_percentage: null, allocated_amount: null, allocation_method: null };
    const { data: updated, error } = await supabase.from('expenses').update({
      description: e.description, expense_date: e.expense_date, due_date: e.due_date || null, total_amount: e.total_amount, category: e.category || null,
      payment_status: e.payment_status, paid_amount: paidAmountFor(e.payment_status, e.total_amount, e.paid_amount),
      payment_date: e.payment_status === 'Pago' || e.payment_status === 'Parcialmente pago' ? e.payment_date || e.expense_date : null, ...split,
    }).eq('id', data.id).eq('user_id', userId).select('id').maybeSingle();
    return error || !updated ? { ok: false as const, error: 'Não foi possível salvar a despesa.' } : { ok: true as const };
  });

export const deleteExpense = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // The document keeps its review and can register the expense again later.
    const { error: unlinkError } = await supabase.from('documents').update({ confirmed_expense_id: null }).eq('user_id', userId).eq('confirmed_expense_id', data.id);
    if (unlinkError) return { ok: false as const, error: 'Não foi possível desvincular o documento.' };
    const { data: deleted, error } = await supabase.from('expenses').delete().eq('id', data.id).eq('user_id', userId).select('id').maybeSingle();
    return error || !deleted ? { ok: false as const, error: 'Não foi possível excluir a despesa.' } : { ok: true as const };
  });

export const deleteDocument = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), deleteExpenses: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: doc, error } = await supabase.from('documents').select('id,file_path').eq('id', data.id).eq('user_id', userId).maybeSingle();
    if (error || !doc) return { ok: false as const, error: 'Documento não encontrado.' };
    const { error: unlinkError } = await supabase.from('documents').update({ confirmed_expense_id: null }).eq('id', doc.id).eq('user_id', userId);
    if (unlinkError) return { ok: false as const, error: 'Não foi possível excluir o documento.' };
    const expenses = data.deleteExpenses
      ? await supabase.from('expenses').delete().eq('document_id', doc.id).eq('user_id', userId)
      : await supabase.from('expenses').update({ document_id: null }).eq('document_id', doc.id).eq('user_id', userId);
    if (expenses.error) return { ok: false as const, error: 'Não foi possível tratar a despesa ligada ao documento.' };
    const { error: deleteError } = await supabase.from('documents').delete().eq('id', doc.id).eq('user_id', userId);
    if (deleteError) return { ok: false as const, error: 'Não foi possível excluir o documento.' };
    await supabase.storage.from('financial-documents').remove([doc.file_path]);
    return { ok: true as const };
  });

export const deleteCategory = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: deleted, error } = await supabase.from('expense_categories').delete().eq('id', data.id).eq('user_id', userId).select('name').maybeSingle();
    if (error || !deleted) return { ok: false as const, error: 'Não foi possível excluir a categoria.' };
    await supabase.from('expenses').update({ category: null }).eq('user_id', userId).eq('category', deleted.name);
    return { ok: true as const };
  });

export const renameCategory = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(100) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: current, error } = await supabase.from('expense_categories').select('name').eq('id', data.id).eq('user_id', userId).maybeSingle();
    if (error || !current) return { ok: false as const, error: 'Categoria não encontrada.' };
    if (current.name === data.name) return { ok: true as const };
    // Categories have no UPDATE grant: create the new name, move expenses, then drop the old one.
    const sameIgnoringCase = current.name.trim().toLowerCase() === data.name.toLowerCase();
    if (sameIgnoringCase) {
      const { error: dropError } = await supabase.from('expense_categories').delete().eq('id', data.id).eq('user_id', userId);
      if (dropError) return { ok: false as const, error: 'Não foi possível renomear a categoria.' };
    }
    const { error: insertError } = await supabase.from('expense_categories').insert({ name: data.name, user_id: userId });
    if (insertError) return { ok: false as const, error: insertError.code === '23505' ? 'Já existe uma categoria com esse nome.' : 'Não foi possível renomear a categoria.' };
    const { error: moveError } = await supabase.from('expenses').update({ category: data.name }).eq('user_id', userId).eq('category', current.name);
    if (moveError) return { ok: false as const, error: 'A categoria nova foi criada, mas as despesas não foram movidas.' };
    if (!sameIgnoringCase) await supabase.from('expense_categories').delete().eq('id', data.id).eq('user_id', userId);
    return { ok: true as const };
  });
