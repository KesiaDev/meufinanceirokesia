import { describe, it, expect } from 'vitest';
import { budgetPlan } from '@/lib/budget';

const e = (total_amount: number, category: string | null, beneficiary_type = 'Pessoal', payment_status = 'Pendente') => ({ total_amount, category, beneficiary_type, payment_status });

describe('budgetPlan', () => {
  it('ideal de mercado é 12% dos ganhos', () => {
    expect(budgetPlan(12100, []).groups.find(g => g.key === 'mercado')!.ideal).toBe(1452);
  });
  it('gastos até 82% dos ganhos estão indo bem', () => {
    expect(budgetPlan(10000, [e(8200, 'Mercado')]).status).toBe('bem');
    expect(budgetPlan(10000, [e(9000, 'Mercado')]).status).toBe('atencao');
    expect(budgetPlan(10000, [e(10001, 'Mercado')]).status).toBe('alerta');
  });
  it('conta da casa sem categoria conta como moradia e canceladas não contam', () => {
    const p = budgetPlan(10000, [e(3300, null, 'Casa'), e(500, 'Mercado', 'Casa', 'Cancelado')]);
    expect(p.groups.find(g => g.key === 'moradia')!.spent).toBe(3300);
    expect(p.spent).toBe(3300);
  });
});
