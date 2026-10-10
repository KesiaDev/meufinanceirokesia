export type ReportExpense = { expense_date: string; category: string | null; total_amount: number; payment_status: string };
export type ReportFilters = { year: string; month: string; category: string };
export const UNCATEGORIZED = 'Sem categoria';
export function expenseReport<T extends ReportExpense>(expenses: T[], filters: ReportFilters) {
  const rows = expenses.filter(e => e.payment_status !== 'Cancelado' &&
    (!filters.year || e.expense_date.slice(0, 4) === filters.year) &&
    (!filters.month || e.expense_date.slice(5, 7) === filters.month) &&
    (!filters.category || (e.category || UNCATEGORIZED) === filters.category));
  const monthly = Array.from({ length: 12 }, (_, i) => ({ name: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][i], total: 0 }));
  const groups = new Map<string, { name: string; total: number; count: number }>();
  for (const row of rows) {
    const amount = Math.round(Number(row.total_amount) * 100);
    const index = Number(row.expense_date.slice(5, 7)) - 1;
    if (monthly[index]) monthly[index].total += amount;
    const name = row.category || UNCATEGORIZED;
    const group = groups.get(name) || { name, total: 0, count: 0 };
    group.total += amount; group.count += 1; groups.set(name, group);
  }
  return { rows, total: rows.reduce((sum, row) => sum + Math.round(Number(row.total_amount) * 100), 0) / 100,
    monthly: monthly.map(m => ({ ...m, total: m.total / 100 })),
    categories: [...groups.values()].map(g => ({ ...g, total: g.total / 100 })).sort((a, b) => b.total - a.total) };
}