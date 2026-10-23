import { describe, expect, it } from 'vitest';
import { expenseEditSchema, paidAmountFor } from '@/lib/expense-edit';

const base = { description: 'Mercado do mês', expense_date: '2026-10-20', due_date: '', payment_date: '', total_amount: 412.35, category: 'Mercado', beneficiary: { type: 'Casa' as const }, payment_status: 'Pendente' as const, paid_amount: 0 };

describe('Edição de despesa', () => {
  it('aceita uma edição válida', () => { expect(expenseEditSchema.safeParse(base).success).toBe(true); });
  it('exige descrição e data válidas', () => {
    expect(expenseEditSchema.safeParse({ ...base, description: '  ' }).success).toBe(false);
    expect(expenseEditSchema.safeParse({ ...base, expense_date: '2026-02-30' }).success).toBe(false);
  });
  it('rejeita valor negativo', () => { expect(expenseEditSchema.safeParse({ ...base, total_amount: -1 }).success).toBe(false); });
  it('pagamento parcial precisa de valor entre zero e o total', () => {
    expect(expenseEditSchema.safeParse({ ...base, payment_status: 'Parcialmente pago', paid_amount: 0 }).success).toBe(false);
    expect(expenseEditSchema.safeParse({ ...base, payment_status: 'Parcialmente pago', paid_amount: 412.35 }).success).toBe(false);
    expect(expenseEditSchema.safeParse({ ...base, payment_status: 'Parcialmente pago', paid_amount: 200 }).success).toBe(true);
  });
  it('valor pago acompanha o status', () => {
    expect(paidAmountFor('Pago', 412.35, 0)).toBe(412.35);
    expect(paidAmountFor('Parcialmente pago', 412.35, 100.005)).toBe(100.01);
    expect(paidAmountFor('Pendente', 412.35, 300)).toBe(0);
    expect(paidAmountFor('Cancelado', 412.35, 412.35)).toBe(0);
  });
  it('permite deixar sem classificação de pessoa', () => { expect(expenseEditSchema.safeParse({ ...base, beneficiary: null }).success).toBe(true); });
});
