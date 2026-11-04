import { CheckCheck, Clock3, Wallet, XCircle } from 'lucide-react';
import { currency } from '@/lib/finance';
import { STATUS_FILTERS, statusSummary, type StatusFilter } from '@/lib/expense-status';
import type { Tables } from '@/integrations/supabase/types';

const ICONS: Record<StatusFilter, typeof Wallet> = { all: Wallet, paid: CheckCheck, unpaid: Clock3, cancelled: XCircle };

/** Clickable chips: show only what is paid, only what is still owed, and the money behind each. */
export function ExpenseStatusFilter({ expenses, value, onChange }: { expenses: Tables<'expenses'>[]; value: StatusFilter; onChange: (filter: StatusFilter) => void }) {
  const summary = statusSummary(expenses);
  return <div className="status-filters" role="group" aria-label="Mostrar despesas por situação de pagamento">
    {STATUS_FILTERS.map(({ key, label }) => {
      const group = summary[key];
      if (key !== 'all' && group.count === 0) return null;
      const Icon = ICONS[key];
      return <button key={key} type="button" aria-pressed={value === key} className={`status-filter ${key} ${value === key ? 'active' : ''}`} onClick={() => onChange(key)}>
        <Icon size={13} />
        <span>{label}</span>
        <span className="status-filter-count">{group.count}</span>
        <span className="status-filter-total">{currency(group.total)}</span>
      </button>;
    })}
  </div>;
}
