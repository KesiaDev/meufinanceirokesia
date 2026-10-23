import { describe, expect, it } from 'vitest';
import { allocation, beneficiaryInput, rebecaShare } from '@/lib/beneficiary';
import { financialTotals } from '@/lib/finance';

describe('Para quem é o gasto', () => {
  it('gasto direto da Rebeca conta inteiro para ela, sem rateio', () => {
    const a = allocation('Direta da Rebeca', 89.9);
    expect(a).toEqual({ beneficiary_type: 'Direta da Rebeca', allocation_percentage: null, allocated_amount: null, allocation_method: null });
    expect(rebecaShare({ total_amount: 89.9, ...a })).toBe(89.9);
  });
  it('gasto dividido atribui só o percentual escolhido, arredondado em centavos', () => {
    const a = allocation('Compartilhada', 1333.33, 30);
    expect(a.allocated_amount).toBe(400);
    expect(a.allocation_percentage).toBe(30);
    expect(allocation('Compartilhada', 100.01, 50).allocated_amount).toBe(50.01);
  });
  it('gasto dividido sem percentual usa metade', () => {
    expect(allocation('Compartilhada', 2000).allocated_amount).toBe(1000);
  });
  it('gastos da casa e pessoais não entram no total da Rebeca', () => {
    const rows = [
      { total_amount: 1800, paid_amount: 0, payment_status: 'Pendente', ...allocation('Casa', 1800) },
      { total_amount: 250, paid_amount: 0, payment_status: 'Pendente', ...allocation('Pessoal', 250) },
      { total_amount: 120, paid_amount: 0, payment_status: 'Pendente', ...allocation('Direta da Rebeca', 120) },
      { total_amount: 600, paid_amount: 0, payment_status: 'Pendente', ...allocation('Compartilhada', 600, 25) },
    ];
    expect(financialTotals(rows).rebeca).toBe(270);
    expect(financialTotals(rows).total).toBe(2770);
  });
  it('rejeita classificação desconhecida', () => {
    expect(beneficiaryInput.safeParse({ type: 'Vizinha' }).success).toBe(false);
    expect(beneficiaryInput.safeParse({ type: 'Compartilhada', percentage: 120 }).success).toBe(false);
  });
});
