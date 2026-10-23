import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { allocation, beneficiaryInput, UNCLASSIFIED } from './beneficiary';
import { isDocumentDate, reviewSchema } from './document-review';
import { expenseEditSchema, paidAmountFor, PAYMENT_STATUSES, type PaymentStatus } from './expense-edit';

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

export const updateReviewedDocument = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), review: reviewSchema, beneficiary: beneficiaryInput.nullable() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context; const r = data.review; const category = r.category?.trim() || null;
    const { data: doc, error } = await supabase.from('documents').select('id,confirmed_expense_id,reviewed_at').eq('id', data.id).eq('user_id', userId).maybeSingle();
    if (error || !doc) return { ok: false as const, error: 'Documento não encontrado.' };
    if (!doc.reviewed_at) return { ok: false as const, error: 'Confirme a revisão antes de editar.' };
    if (category) {
      const { data: found, error: categoryError } = await supabase.from('expense_categories').select('id').eq('user_id', userId).eq('name', category).maybeSingle();
      if (categoryError || !found) return { ok: false as const, error: 'Selecione uma categoria da sua conta.' };
    }
    const { data: expense } = doc.confirmed_expense_id ? await supabase.from('expenses').select('*').eq('id', doc.confirmed_expense_id).eq('user_id', userId).maybeSingle() : { data: null };
    if (expense) {
      if (r.kind !== 'expense') return { ok: false as const, error: 'Esta nota tem uma despesa registrada. Para mudar o tipo, exclua a despesa em Despesas.' };
      if (r.total_amount === null || !r.document_date || !r.description.trim()) return { ok: false as const, error: 'Preencha descrição, data e valor.' };
    }
    const { error: docError } = await supabase.from('documents').update({
      document_type: r.document_type, issuer: r.issuer || null, document_date: r.document_date || null, due_date: r.due_date || null,
      total_amount: r.total_amount, notes: r.notes, preferred_category: category, reviewed_data: { ...r, category: category ?? '' },
    }).eq('id', doc.id).eq('user_id', userId);
    if (docError) return { ok: false as const, error: 'Não foi possível salvar o documento.' };
    if (!expense) return { ok: true as const };
    const total = r.total_amount as number;
    const status = (PAYMENT_STATUSES as readonly string[]).includes(expense.payment_status) ? expense.payment_status as PaymentStatus : 'Pendente';
    const split = data.beneficiary ? allocation(data.beneficiary.type, total, data.beneficiary.percentage)
      : { beneficiary_type: UNCLASSIFIED, allocation_percentage: null, allocated_amount: null, allocation_method: null };
    const { error: expenseError } = await supabase.from('expenses').update({
      description: r.description.trim(), expense_date: r.document_date, due_date: r.due_date || null, total_amount: total, category,
      paid_amount: paidAmountFor(status, total, Math.min(Number(expense.paid_amount), total)), ...split,
    }).eq('id', expense.id).eq('user_id', userId);
    return expenseError ? { ok: false as const, error: 'O documento foi salvo, mas a despesa não foi atualizada.' } : { ok: true as const };
  });
