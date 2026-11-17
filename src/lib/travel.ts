export const TRAVEL_CATEGORIES = ['Seguro viagem','Passagem aérea','Hospedagem','Táxi','Uber / Bolt','Metrô','Ônibus','Trem','Aluguel de carro','Combustível','Estacionamento / pedágio','Alimentação','Inscrição do evento','Internet / chip','Lavanderia','Outros'] as const;
export const TRAVEL_PAYERS = ['Empresa','Conta própria'] as const;
export type TravelPerson = 'Késia' | 'Gisele';
type Row = { category?: string; paid_by?: string; amount: number | string; currency: string; expense_date: string; description: string; notes: string; person: string };
export function travelTotals(rows: Row[]) {
  const cents: { EUR: number; BRL: number } = { EUR: 0, BRL: 0 };
  for (const r of rows) if (r.currency === 'EUR' || r.currency === 'BRL') cents[r.currency] += Math.round(Number(r.amount) * 100);
  return { EUR: cents.EUR / 100, BRL: cents.BRL / 100 };
}
const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
export function travelCsv(rows: Row[]) {
  const head = 'Pessoa;Data;Tipo;Descrição;Quem paga;Valor;Moeda;Observação';
  const lines = rows.map(r => [q(r.person), r.expense_date.split('-').reverse().join('/'), q(r.category ?? 'Outros'), q(r.description), q(r.paid_by ?? 'Empresa'), Number(r.amount).toFixed(2).replace('.', ','), r.currency, q(r.notes)].join(';'));
  return [head, ...lines].join('\n');
}
