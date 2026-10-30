import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarCheck, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BENEFICIARIES, type BeneficiaryType } from '@/lib/beneficiary';
import { currency } from '@/lib/finance';
import { deleteFixedExpense, launchFixedExpenses, saveFixedExpense } from '@/lib/fixed-expenses.functions';
import type { Tables } from '@/integrations/supabase/types';

type Fixed = Tables<'fixed_expenses'>;

export function FixedExpenses({ items, expenses, categories, month }: { items: Fixed[]; expenses: Tables<'expenses'>[]; categories: Tables<'expense_categories'>[]; month: string }) {
  const launch = useServerFn(launchFixedExpenses); const query = useQueryClient();
  const [amounts, setAmounts] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false);
  const launched = new Map(expenses.filter(e => e.fixed_expense_id && e.reference_month === month).map(e => [e.fixed_expense_id!, e]));
  async function run() {
    setBusy(true);
    try {
      const values = Object.fromEntries(Object.entries(amounts).filter(([, v]) => v !== '').map(([k, v]) => [k, Number(v)]));
      const r = await launch({ data: { month, amounts: values } });
      if (!r.ok) toast.error(r.error); else { toast.success(r.created ? `${r.created} despesas lançadas como pendentes.` : 'Nada novo para lançar neste mês.'); setAmounts({}); await query.invalidateQueries({ queryKey: ['workspace'] }); }
    } catch { toast.error('Não foi possível lançar as despesas.'); } finally { setBusy(false); }
  }
  const pending = items.filter(i => !launched.has(i.id));
  return <>
    <section className="data-panel mb-6">
      <div className="panel-title mb-4"><div><h2>Lançar no mês {month ? month.split('-').reverse().join('/') : ''}</h2><p>Preencha o valor das contas que mudam e lance todas de uma vez, como pendentes.</p></div></div>
      {!month ? <p className="text-sm text-muted-foreground">Escolha um mês no topo da página.</p> : <>
        <div className="space-y-2">{items.map(i => { const done = launched.get(i.id); return <div key={i.id} className="flex flex-wrap items-center gap-3 text-sm">
          <span className="flex-1 min-w-40 font-medium">{i.name}{i.variable && <span className="text-xs text-muted-foreground"> · valor muda todo mês</span>}</span>
          {done ? <span className="text-success">Lançada · {currency(Number(done.total_amount))}</span> :
            <input type="number" min="0" step="0.01" className="filter-select w-36" aria-label={`Valor de ${i.name} neste mês`} placeholder={i.amount != null ? String(i.amount) : 'Valor do mês'} value={amounts[i.id] ?? (i.variable ? '' : i.amount ?? '')} onChange={e => setAmounts({ ...amounts, [i.id]: e.target.value })} disabled={busy}/>}
        </div>; })}</div>
        <Button className="mt-4" disabled={busy || !pending.length} onClick={run}><CalendarCheck/>{busy ? 'Lançando…' : 'Lançar despesas fixas do mês'}</Button>
        <p className="text-xs text-muted-foreground mt-2">Contas sem valor ficam para depois. Nenhuma conta é lançada duas vezes no mesmo mês.</p>
      </>}
    </section>
    <section className="data-panel"><div className="panel-title mb-4"><div><h2>Minhas despesas fixas</h2><p>Edite o valor padrão, o dia de vencimento e para quem é.</p></div></div>
      <div className="space-y-3">{items.map(i => <FixedRow key={`${i.id}-${i.amount}-${i.name}`} item={i} categories={categories}/>)}<FixedRow categories={categories}/></div>
    </section>
  </>;
}

function FixedRow({ item, categories }: { item?: Fixed; categories: Tables<'expense_categories'>[] }) {
  const save = useServerFn(saveFixedExpense); const remove = useServerFn(deleteFixedExpense); const query = useQueryClient();
  const [f, setF] = useState({ name: item?.name ?? '', amount: item?.amount != null ? String(item.amount) : '', variable: item?.variable ?? false, due_day: item?.due_day ? String(item.due_day) : '', category: item?.category ?? '', beneficiary_type: (item?.beneficiary_type ?? 'Casa') as BeneficiaryType });
  const [busy, setBusy] = useState(false);
  async function act(fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) {
    setBusy(true);
    try { const r = await fn(); if (!r.ok) toast.error(r.error); else { toast.success(msg); if (!item) setF({ ...f, name: '', amount: '' }); await query.invalidateQueries({ queryKey: ['workspace'] }); } }
    catch { toast.error('Confira os campos.'); } finally { setBusy(false); }
  }
  const submit = () => act(() => save({ data: { id: item?.id, name: f.name, amount: f.amount === '' ? null : Number(f.amount), variable: f.variable, due_day: f.due_day === '' ? null : Number(f.due_day), category: f.category, beneficiary_type: f.beneficiary_type } }), item ? 'Despesa fixa salva.' : 'Despesa fixa adicionada.');
  return <div className="flex flex-wrap items-end gap-2 border-b border-border pb-3">
    <div className="field mt-0 flex-1 min-w-40"><label>Nome</label><input value={f.name} placeholder={item ? '' : 'Nova despesa fixa'} disabled={busy} onChange={e => setF({ ...f, name: e.target.value })}/></div>
    <div className="field mt-0 w-28"><label>Valor (R$)</label><input type="number" min="0" step="0.01" value={f.amount} placeholder="A definir" disabled={busy} onChange={e => setF({ ...f, amount: e.target.value })}/></div>
    <div className="field mt-0 w-20"><label>Dia</label><input type="number" min="1" max="31" value={f.due_day} disabled={busy} onChange={e => setF({ ...f, due_day: e.target.value })}/></div>
    <div className="field mt-0"><label>Categoria</label><select className="filter-select" value={f.category} disabled={busy} onChange={e => setF({ ...f, category: e.target.value })}><option value="">Sem categoria</option>{f.category && !categories.some(c => c.name === f.category) && <option>{f.category}</option>}{categories.map(c => <option key={c.id}>{c.name}</option>)}</select></div>
    <div className="field mt-0"><label>Para quem</label><select className="filter-select" value={f.beneficiary_type} disabled={busy} onChange={e => setF({ ...f, beneficiary_type: e.target.value as BeneficiaryType })}>{BENEFICIARIES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}</select></div>
    <label className="flex items-center gap-2 text-xs pb-2"><input type="checkbox" className="accent-primary" checked={f.variable} disabled={busy} onChange={e => setF({ ...f, variable: e.target.checked })}/>Valor muda</label>
    <Button size="sm" disabled={busy || !f.name.trim()} onClick={submit}>{item ? <Save/> : <Plus/>}{item ? 'Salvar' : 'Adicionar'}</Button>
    {item && <Button size="icon" variant="ghost" aria-label={`Excluir ${item.name}`} disabled={busy} onClick={() => act(() => remove({ data: { id: item.id } }), 'Despesa fixa excluída.')}><Trash2 className="text-destructive"/></Button>}
  </div>;
}
