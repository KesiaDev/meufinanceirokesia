// Situação de pagamento das despesas: quem já quitou e quem ainda deve.
// Only a settled "Pago" counts as paid — pending and partial still owe money.
export type StatusFilter = 'all' | 'paid' | 'unpaid' | 'cancelled';

export const STATUS_FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'paid', label: 'Pagas' },
  { key: 'unpaid', label: 'A pagar' },
  { key: 'cancelled', label: 'Canceladas' },
] as const;

export const statusFilterLabel = (filter: StatusFilter) => STATUS_FILTERS.find(f => f.key === filter)?.label ?? 'Todas';

export const isPaidStatus = (status: string) => status === 'Pago';
export const isUnpaidStatus = (status: string) => status === 'Pendente' || status === 'Parcialmente pago';
export const isCancelledStatus = (status: string) => status === 'Cancelado';

export function matchesStatusFilter(status: string, filter: StatusFilter) {
  if (filter === 'paid') return isPaidStatus(status);
  if (filter === 'unpaid') return isUnpaidStatus(status);
  if (filter === 'cancelled') return isCancelledStatus(status);
  return true;
}

type MoneyRow = { total_amount: number | string | null; payment_status: string };
type Group = { count: number; total: number };

const cents = (value: number | string | null) => Math.round(Number(value ?? 0) * 100);

/** Counts and sums behind the clickable chips, in integer cents, so chips and list always agree. */
export function statusSummary(rows: MoneyRow[]) {
  const sum = (list: MoneyRow[]) => list.reduce((total, row) => total + cents(row.total_amount), 0) / 100;
  const group = (keep: (status: string) => boolean): Group => {
    const list = rows.filter(row => keep(row.payment_status));
    return { count: list.length, total: sum(list) };
  };
  // "Todas" shows every row but totals like the page header, which leaves cancelled expenses out.
  return {
    all: { count: rows.length, total: sum(rows.filter(row => !isCancelledStatus(row.payment_status))) },
    paid: group(isPaidStatus),
    unpaid: group(isUnpaidStatus),
    cancelled: group(isCancelledStatus),
  };
}
