import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { Coins, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { currency, financialTotals } from '@/lib/finance';
import { saveIncome, deleteIncome } from '@/lib/incomes.functions';
import { budgetPlan } from '@/lib/budget';
import type { Tables } from '@/integrations/supabase/types';

export function Incomes({ items, expenses, month }: { items: Tables<'incomes'>[]; expenses: Tables<'expenses'>[]; month: string }) {
  const total = items.reduce((s, i) => s + Math.round(Number(i.amount) * 100), 0) / 100;
  const monthExp = expenses.filter(e => e.expense_date.startsWith(month));
  const spent = financialTotals(monthExp).total;
  const plan = budgetPlan(total, monthExp);
  const balance = Math.round((total - spent) * 100) / 100;
  const qc = useQueryClient(); const save = useServerFn(saveIncome);
  async function add() { const r = await save({ data: { name: 'Novo ganho', amount: 0, due_day: null } }); if (!r.ok) toast.error(r.error); else await qc.invalidateQueries({ queryKey: ['workspace'] }); }
  return <>
    <div className="stat-grid">
      <Stat title="Ganhos do mês" value={currency(total)} caption={`${items.length} entradas fixas`} />
      <Stat title="Despesas do mês" value={currency(spent)} caption="Tudo registrado no período" />
      <Stat title="Sobra do mês" value={currency(balance)} caption={balance < 0 ? 'Gastos acima dos ganhos' : 'Ganhos menos despesas'} />
    </div>
    <HealthBar ratio={plan.ratio} status={plan.status} savings={plan.savingsIdeal} balance={balance} />
    <section className="data-panel mb-6">
      <div className="panel-title mb-4"><div><h2>Quanto é ideal gastar em cada coisa</h2><p>Sugestão baseada nos seus ganhos de {currency(total)}, com {currency(plan.savingsIdeal)} guardados por mês</p></div></div>
      <div className="space-y-4">{plan.groups.map(g => { const r = g.ideal ? g.spent / g.ideal : 0; return <div key={g.key}>
        <div className="flex justify-between text-sm"><span className="font-bold">{g.label} <span className="text-muted-foreground font-normal">· {g.pct}%</span></span><span>{currency(g.spent)} <span className="text-muted-foreground">de {currency(g.ideal)}</span></span></div>
        <Bar value={r} />
        {r > 1 && <p className="text-xs mt-1" style={{ color: 'var(--destructive)' }}>Passou {currency(Math.round((g.spent - g.ideal) * 100) / 100)} do ideal.</p>}
      </div>; })}</div>
    </section>
    <section className="data-panel" style={{ padding: 0 }}>
      <div className="panel-title" style={{ padding: '20px 24px 12px' }}><div><h2>Seus ganhos</h2><p>Entradas que chegam todo mês</p></div><Button size="sm" variant="outline" onClick={add}><Plus />Adicionar ganho</Button></div>
      <div className="fixed-list">{items.map(i => <IncomeRow key={`${i.id}-${i.amount}-${i.due_day}-${i.name}`} item={i} />)}</div>
    </section>
  </>;
}

function Stat({ title, value, caption }: { title: string; value: string; caption: string }) {
  return <article className="stat"><div className="stat-top"><span>{title}</span><div className="stat-icon green"><Coins size={16} /></div></div><div className="stat-value">{value}</div><p className="stat-caption">{caption}</p></article>;
}

function IncomeRow({ item }: { item: Tables<'incomes'> }) {
  const qc = useQueryClient(); const save = useServerFn(saveIncome); const remove = useServerFn(deleteIncome);
  const [name, setName] = useState(item.name); const [amount, setAmount] = useState(String(item.amount).replace('.', ',')); const [day, setDay] = useState(item.due_day ? String(item.due_day) : '');
  const dirty = name !== item.name || amount !== String(item.amount).replace('.', ',') || day !== (item.due_day ? String(item.due_day) : '');
  async function commit() {
    const value = Number(amount.replace(/\./g, '').replace(',', '.')); const d = day ? Number(day) : null;
    if (!name.trim() || !Number.isFinite(value) || value < 0 || (d !== null && (!Number.isInteger(d) || d < 1 || d > 31))) { toast.error('Confira nome, valor e dia.'); return; }
    const r = await save({ data: { id: item.id, name, amount: value, due_day: d } }); if (!r.ok) toast.error(r.error); else { toast.success('Ganho salvo.'); await qc.invalidateQueries({ queryKey: ['workspace'] }); }
  }
  async function del() { const r = await remove({ data: { id: item.id } }); if (!r.ok) toast.error(r.error); else await qc.invalidateQueries({ queryKey: ['workspace'] }); }
  return <div className="fixed-row">
    <div className="fixed-row-icon"><Coins size={17} /></div>
    <div className="fixed-row-info"><input aria-label="Nome do ganho" className="filter-select w-full" value={name} onChange={e => setName(e.target.value)} /></div>
    <input aria-label="Dia que cai" placeholder="Dia" className="filter-select" style={{ width: 70 }} value={day} onChange={e => setDay(e.target.value.replace(/\D/g, ''))} />
    <input aria-label="Valor" inputMode="decimal" className="filter-select fixed-amount" value={amount} onChange={e => setAmount(e.target.value)} />
    {dirty && <Button size="sm" onClick={commit}>Salvar</Button>}
    <Button variant="ghost" size="icon" aria-label="Excluir ganho" title="Excluir ganho" onClick={del}><Trash2 className="text-destructive" /></Button>
  </div>;
}

function Bar({ value }: { value: number }) {
  const color = value > 1 ? 'var(--destructive)' : value > 0.85 ? 'var(--warning)' : 'var(--success)';
  return <div className="h-2.5 rounded-full mt-2 overflow-hidden" style={{ background: 'var(--muted)' }}><div className="h-full rounded-full transition-all" style={{ width: `${Math.min(value, 1) * 100}%`, background: color }} /></div>;
}

function HealthBar({ ratio, status, savings, balance }: { ratio: number; status: 'bem' | 'atencao' | 'alerta'; savings: number; balance: number }) {
  const text = status === 'bem' ? { t: 'Indo muito bem! ✿', d: balance >= savings ? `Dá para guardar ${currency(savings)} este mês.` : `Ainda sobra ${currency(balance)}. Tente guardar uma parte.` }
    : status === 'atencao' ? { t: 'Atenção: perto do limite', d: 'Os gastos já passaram de 82% dos ganhos. Segure lazer e compras extras.' }
    : { t: 'Cuidado: gastando mais do que ganha', d: 'Veja abaixo onde passou do ideal para ajustar.' };
  return <section className="data-panel mb-6">
    <div className="flex justify-between items-baseline"><h2 className="font-bold">{text.t}</h2><span className="text-sm text-muted-foreground">{Number.isFinite(ratio) ? Math.round(ratio * 100) : 100}% dos ganhos usados</span></div>
    <Bar value={Number.isFinite(ratio) ? ratio / 0.82 * 0.85 : 2} />
    <p className="subtitle mt-2">{text.d}</p>
  </section>;
}
