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
  const [y, m] = month.split('-').map(Number);
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
  const Row = ({ e }: { e: Tables<'expenses'> }) => (
    <li className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
      <div className="min-w-0"><p className="text-sm font-semibold truncate">{e.description}</p><p className="text-xs text-muted-foreground">Vence {dateLabel(dueOf(e))}{isOpen(e) ? '' : ' · paga'}</p></div>
      <div className="flex items-center gap-2 shrink-0"><span className="text-sm font-bold">{currency(Number(e.total_amount))}</span>{isOpen(e) && <Button size="sm" variant="outline" disabled={busy === e.id} onClick={() => markPaid(e.id)}><CheckCheck />Paguei</Button>}</div>
    </li>
  );

  return <>
    {(overdue.length > 0 || soon.length > 0) && <section className="data-panel mb-5">
      <div className="panel-title mb-3"><h2 className="flex items-center gap-2"><BellRing size={16} className="text-primary" /> Avisos de contas</h2></div>
      {overdue.length > 0 && <><p className="text-sm font-bold text-destructive flex items-center gap-2 mt-2"><AlertTriangle size={15} /> Atrasadas ({overdue.length})</p><ul>{overdue.map(e => <Row key={e.id} e={e} />)}</ul></>}
      {soon.length > 0 && <><p className="text-sm font-bold text-warning flex items-center gap-2 mt-4"><Clock3 size={15} /> Vencem nos próximos 7 dias ({soon.length})</p><ul>{soon.map(e => <Row key={e.id} e={e} />)}</ul></>}
    </section>}
    <section className="data-panel">
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-muted-foreground mb-2">{WEEK.map(w => <div key={w}>{w}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: first }).map((_, i) => <div key={`b${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const d = `${month}-${String(i + 1).padStart(2, '0')}`;
          const items = monthItems.filter(e => dueOf(e) === d);
          const pending = items.filter(isOpen);
          const late = pending.length > 0 && d < today;
          const total = pending.reduce((s, e) => s + Number(e.total_amount), 0);
          return <button key={d} type="button" onClick={() => setDay(d)} aria-label={`Dia ${i + 1}`}
            className={`min-h-16 rounded-md border p-1 text-left transition-colors ${day === d ? 'border-primary bg-accent' : 'border-border hover:bg-accent/60'} ${d === today ? 'ring-2 ring-primary' : ''}`}>
            <div className="text-xs font-bold">{i + 1}</div>
            {items.length > 0 && <div className={`mt-1 text-[10px] font-bold leading-tight ${late ? 'text-destructive' : pending.length ? 'text-primary' : 'text-success'}`}>
              {pending.length ? <>{pending.length} {pending.length === 1 ? 'conta' : 'contas'}<span className="hidden sm:block">{currency(total)}</span></> : '✓ pago'}
            </div>}
          </button>;
        })}
      </div>
      <div className="mt-5">
        {day ? <><h3 className="font-bold text-sm mb-2">Contas do dia {dateLabel(day)}</h3>{selected.length ? <ul>{selected.map(e => <Row key={e.id} e={e} />)}</ul> : <p className="text-sm text-muted-foreground">Nenhuma conta neste dia.</p>}</> : <p className="text-sm text-muted-foreground">Toque em um dia para ver as contas.</p>}
      </div>
    </section>
  </>;
}
