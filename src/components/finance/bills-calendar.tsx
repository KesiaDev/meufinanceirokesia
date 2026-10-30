import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { AlertTriangle, BellRing, CheckCheck, Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { currency, dateLabel } from '@/lib/finance';
import { markExpensePaid } from '@/lib/expenses.functions';
import type { Tables } from '@/integrations/supabase/types';

const WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const dueOf = (e: Tables<'expenses'>) => e.due_date ?? e.expense_date;
const isOpen = (e: Tables<'expenses'>) => e.payment_status !== 'Pago' && e.payment_status !== 'Cancelado';

export function BillsCalendar({ expenses, month }: { expenses: Tables<'expenses'>[]; month: string }) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const y = Number(month.slice(0, 4)), m = Number(month.slice(5, 7));
  const days = new Date(y, m, 0).getDate();
  const first = new Date(y, m - 1, 1).getDay();
  const [day, setDay] = useState<string | null>(null);
  const [busy, setBusy] = useState('');
  const pay = useServerFn(markExpensePaid);
  const qc = useQueryClient();

  const monthItems = expenses.filter(e => dueOf(e).startsWith(month) && e.payment_status !== 'Cancelado');
  const open = expenses.filter(isOpen);
  const overdue = open.filter(e => dueOf(e) < today);
  const in7 = new Date(`${today}T12:00:00`); in7.setDate(in7.getDate() + 7);
  const limit = in7.toISOString().slice(0, 10);
  const soon = open.filter(e => dueOf(e) >= today && dueOf(e) <= limit).sort((a, b) => dueOf(a).localeCompare(dueOf(b)));
  const selected = day ? monthItems.filter(e => dueOf(e) === day) : [];

  async function markPaid(id: string) {
    setBusy(id);
    try { const r = await pay({ data: { id } }); if (!r.ok) toast.error(r.error); else { await qc.invalidateQueries({ queryKey: ['workspace'] }); toast.success('Conta marcada como paga.'); } }
    catch { toast.error('Não foi possível marcar como paga.'); }
    setBusy('');
  }
  const Row = ({ e, tone = '' }: { e: Tables<'expenses'>; tone?: string }) => {
    const d = dueOf(e);
    return <li className={`bill-row ${tone}`}>
      <div className="bill-date"><strong>{d.slice(8, 10)}</strong><span>{new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' }).format(new Date(`${d}T12:00:00Z`)).replace('.', '')}</span></div>
      <div className="min-w-0 flex-1"><p className="bill-name">{e.description}</p><p className="bill-meta">{e.category ?? 'Sem categoria'}{isOpen(e) ? '' : ' · paga ✓'}</p></div>
      <span className="bill-amount">{currency(Number(e.total_amount))}</span>
      {isOpen(e) && <Button size="sm" variant="outline" className="shrink-0" disabled={busy === e.id} onClick={() => markPaid(e.id)}><CheckCheck /><span className="max-sm:hidden">Paguei</span></Button>}
    </li>;
  };
  const sum = (l: Tables<'expenses'>[]) => l.reduce((s, e) => s + Number(e.total_amount), 0);

  return <>
    {(overdue.length > 0 || soon.length > 0) && <div className="bill-alerts">
      {overdue.length > 0 && <section className="bill-alert late">
        <header><span className="bill-alert-icon"><AlertTriangle size={17} /></span><div><h2>Atrasadas</h2><p>{overdue.length} {overdue.length === 1 ? 'conta' : 'contas'} · {currency(sum(overdue))}</p></div></header>
        <ul>{overdue.map(e => <Row key={e.id} e={e} tone="late" />)}</ul></section>}
      {soon.length > 0 && <section className="bill-alert soon">
        <header><span className="bill-alert-icon"><Clock3 size={17} /></span><div><h2>Vencem nos próximos 7 dias</h2><p>{soon.length} {soon.length === 1 ? 'conta' : 'contas'} · {currency(sum(soon))}</p></div></header>
        <ul>{soon.map(e => <Row key={e.id} e={e} />)}</ul></section>}
    </div>}
    <section className="data-panel bill-calendar">
      <div className="panel-title"><div><h2 className="flex items-center gap-2"><BellRing size={16} className="text-primary" /> Mês de contas</h2><p>Toque em um dia para ver o que vence.</p></div>
        <div className="bill-legend"><span><i className="dot pending" />A pagar</span><span><i className="dot late" />Atrasada</span><span><i className="dot paid" />Paga</span></div></div>
      <div className="bill-week">{WEEK.map(w => <div key={w}>{w}</div>)}</div>
      <div className="bill-grid">
        {Array.from({ length: first }).map((_, i) => <div key={`b${i}`} className="bill-blank" />)}
        {Array.from({ length: days }, (_, i) => {
          const d = `${month}-${String(i + 1).padStart(2, '0')}`;
          const items = monthItems.filter(e => dueOf(e) === d);
          const pending = items.filter(isOpen);
          const state = !items.length ? '' : pending.length ? (d < today ? 'late' : 'pending') : 'paid';
          return <Button variant="ghost" key={d} type="button" onClick={() => setDay(d)} aria-label={`Dia ${i + 1}`}
            className={`bill-day ${state} ${day === d ? 'selected' : ''} ${d === today ? 'today' : ''}`}>
            <span className="bill-day-num">{i + 1}</span>
            {items.length > 0 && <span className="bill-day-info">
              {pending.length ? <><b>{currency(sum(pending))}</b><small>{pending.length} {pending.length === 1 ? 'conta' : 'contas'}</small></> : <small>✓ pago</small>}
            </span>}
          </Button>;
        })}
      </div>
      <div className="bill-day-detail">
        {day ? <><h3>Contas do dia {dateLabel(day)}</h3>{selected.length ? <ul>{selected.map(e => <Row key={e.id} e={e} />)}</ul> : <p className="text-sm text-muted-foreground">Nenhuma conta neste dia ✿</p>}</> : <p className="text-sm text-muted-foreground">Toque em um dia para ver as contas.</p>}
      </div>
    </section>
  </>;
}
