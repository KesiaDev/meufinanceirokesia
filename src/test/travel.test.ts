import { describe, it, expect } from 'vitest';
import { travelTotals, travelCsv } from '@/lib/travel';
const r = (amount: number, currency: string) => ({ amount, currency, expense_date: '2026-11-20', description: 'Táxi', notes: '', person: 'Késia' });
describe('viagem', () => {
  it('soma euros e reais separadamente', () => { expect(travelTotals([r(0.1, 'EUR'), r(0.2, 'EUR'), r(50, 'BRL')])).toEqual({ EUR: 0.3, BRL: 50 }); });
  it('exporta valor com vírgula e data brasileira', () => { expect(travelCsv([r(12.5, 'EUR')]).split('\n')[1]).toBe('"Késia";20/11/2026;"Outros";"Táxi";"Empresa";12,50;EUR;""'); });
  it('separa empresa e conta própria', () => { const rows=[{...r(10,'EUR'),paid_by:'Empresa'},{...r(5,'EUR'),paid_by:'Conta própria'}]; expect(travelTotals(rows.filter(x=>x.paid_by==='Empresa')).EUR).toBe(10); });
});
