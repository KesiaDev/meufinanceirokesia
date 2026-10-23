import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { Check, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { updateExpense } from '@/lib/expenses.functions';
import { BENEFICIARY_VALUES, type BeneficiaryType } from '@/lib/beneficiary';
import { expenseEditSchema, PAYMENT_STATUSES, type PaymentStatus } from '@/lib/expense-edit';
import type { Tables } from '@/integrations/supabase/types';
import { BeneficiaryPicker, type BeneficiaryChoice } from './beneficiary-picker';

export function ExpenseEditDialog({ expense, categories, onClose }: { expense: Tables<'expenses'>; categories: Tables<'expense_categories'>[]; onClose: () => void }) {
  const save = useServerFn(updateExpense); const query = useQueryClient();
  const [form, setForm] = useState({
    description: expense.description, expense_date: expense.expense_date, due_date: expense.due_date ?? '', payment_date: expense.payment_date ?? '',
    total_amount: String(expense.total_amount), category: expense.category ?? '', payment_status: (PAYMENT_STATUSES as readonly string[]).includes(expense.payment_status) ? expense.payment_status as PaymentStatus : 'Pendente',
    paid_amount: String(expense.paid_amount),
  });
  const [beneficiary, setBeneficiary] = useState<BeneficiaryChoice>({ type: (BENEFICIARY_VALUES as readonly string[]).includes(expense.beneficiary_type) ? expense.beneficiary_type as BeneficiaryType : '', percentage: Number(expense.allocation_percentage ?? 50) });
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [key]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    const parsed = expenseEditSchema.safeParse({ ...form, total_amount: Number(form.total_amount), paid_amount: Number(form.paid_amount || 0), beneficiary: beneficiary.type ? { type: beneficiary.type, percentage: beneficiary.percentage } : null });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Confira os campos.'); return; }
    setBusy(true);
    try { const result = await save({ data: { id: expense.id, expense: parsed.data } });
      if (!result.ok) { setError(result.error); return; }
      await query.invalidateQueries({ queryKey: ['workspace'] }); toast.success('Despesa atualizada.'); onClose();
    } catch { setError('Não foi possível salvar a despesa.'); } finally { setBusy(false); }
  }

  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto">
    <DialogHeader><DialogTitle>Editar despesa</DialogTitle><DialogDescription>Altere qualquer informação e salve.</DialogDescription></DialogHeader>
    <form onSubmit={submit} className="space-y-4">
      <div className="field mt-0"><label htmlFor="edit-description">Descrição</label><input id="edit-description" value={form.description} maxLength={1000} disabled={busy} onChange={set('description')}/></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="field mt-0"><label htmlFor="edit-amount">Valor total (R$)</label><input id="edit-amount" type="number" min="0" step="0.01" value={form.total_amount} disabled={busy} onChange={set('total_amount')}/></div>
        <div className="field mt-0"><label htmlFor="edit-date">Data</label><input id="edit-date" type="date" value={form.expense_date} disabled={busy} onChange={set('expense_date')}/></div>
        <div className="field mt-0"><label htmlFor="edit-category">Categoria</label><select id="edit-category" className="filter-select" value={form.category} disabled={busy} onChange={set('category')}><option value="">Sem categoria</option>{form.category && !categories.some(c => c.name === form.category) && <option>{form.category}</option>}{categories.map(c => <option key={c.id}>{c.name}</option>)}</select></div>
        <div className="field mt-0"><label htmlFor="edit-due">Vencimento</label><input id="edit-due" type="date" value={form.due_date} disabled={busy} onChange={set('due_date')}/></div>
      </div>
      <div className="field mt-0"><label htmlFor="edit-beneficiary">Para quem é este gasto?</label><BeneficiaryPicker id="edit-beneficiary" value={beneficiary} onChange={setBeneficiary} disabled={busy}/></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="field mt-0"><label htmlFor="edit-status">Pagamento</label><select id="edit-status" className="filter-select" value={form.payment_status} disabled={busy} onChange={set('payment_status')}>{PAYMENT_STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
        {form.payment_status === 'Parcialmente pago' && <div className="field mt-0"><label htmlFor="edit-paid">Valor já pago (R$)</label><input id="edit-paid" type="number" min="0" step="0.01" value={form.paid_amount} disabled={busy} onChange={set('paid_amount')}/></div>}
        {(form.payment_status === 'Pago' || form.payment_status === 'Parcialmente pago') && <div className="field mt-0"><label htmlFor="edit-payment-date">Data do pagamento</label><input id="edit-payment-date" type="date" value={form.payment_date} disabled={busy} onChange={set('payment_date')}/></div>}
      </div>
      {error && <p role="alert" className="inline-error">{error}</p>}
      <div className="flex gap-2 justify-end"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? <LoaderCircle className="animate-spin"/> : <Check/>}{busy ? 'Salvando…' : 'Salvar alterações'}</Button></div>
    </form>
  </DialogContent></Dialog>;
}
