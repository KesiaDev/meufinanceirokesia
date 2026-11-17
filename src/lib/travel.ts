export type TravelPerson = 'Késia' | 'Gisele';
type Row = { amount: number | string; currency: string; expense_date: string; description: string; notes: string; person: string };
export function travelTotals(rows: Row[]) {
  const cents: { EUR: number; BRL: number } = { EUR: 0, BRL: 0 };
  for (const r of rows) if (r.currency === 'EUR' || r.currency === 'BRL') cents[r.currency] += Math.round(Number(r.amount) * 100);
  return { EUR: cents.EUR / 100, BRL: cents.BRL / 100 };
}
const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
export function travelCsv(rows: Row[]) {
  const head = 'Pessoa;Data;Descrição;Valor;Moeda;Observação';
  const lines = rows.map(r => [q(r.person), r.expense_date.split('-').reverse().join('/'), q(r.description), Number(r.amount).toFixed(2).replace('.', ','), r.currency, q(r.notes)].join(';'));
  return [head, ...lines].join('\n');
}
