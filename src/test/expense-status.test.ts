import { describe, expect, it } from 'vitest';
import { financialTotals } from '@/lib/finance';
import { matchesStatusFilter, statusFilterSingular, statusSummary } from '@/lib/expense-status';

const rows = [
  { total_amount: 3300, payment_status: 'Pago' },
  { total_amount: 119.9, payment_status: 'Pendente' },
  { total_amount: 200, payment_status: 'Parcialmente pago' },
  { total_amount: 50, payment_status: 'Cancelado' },
];

describe('Situação de pagamento das despesas', () => {
  it('só considera paga a despesa com status Pago', () => {
    expect(matchesStatusFilter('Pago', 'paid')).toBe(true);
    expect(matchesStatusFilter('Parcialmente pago', 'paid')).toBe(false);
    expect(matchesStatusFilter('Pendente', 'paid')).toBe(false);
    expect(matchesStatusFilter('Cancelado', 'paid')).toBe(false);
  });

  it('deixa pendente e parcialmente pago na lista de contas a pagar', () => {
    expect(statusSummary(rows).unpaid).toEqual({ count: 2, total: 319.9 });
  });

  it('separa pagas e canceladas com suas somas', () => {
    expect(statusSummary(rows).paid).toEqual({ count: 1, total: 3300 });
    expect(statusSummary(rows).cancelled).toEqual({ count: 1, total: 50 });
  });

  it('mostra todas as linhas, mas soma sem as canceladas como o topo da página', () => {
    const summary = statusSummary(rows);
    expect(summary.all.count).toBe(4);
    expect(summary.all.total).toBe(
      financialTotals(rows.map(r => ({ ...r, paid_amount: 0, beneficiary_type: 'Casa', allocated_amount: null }))).total,
    );
  });

  it('escreve a situação no singular para o aviso de lista vazia', () => {
    expect(statusFilterSingular('paid')).toBe('paga');
    expect(statusFilterSingular('unpaid')).toBe('a pagar');
    expect(statusFilterSingular('cancelled')).toBe('cancelada');
  });
});
