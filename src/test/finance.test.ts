import { describe, expect, it } from 'vitest';
import { validateDocument, financialTotals } from '@/lib/finance';
describe('Integridade financeira', () => {
  it('não contabiliza boleto pendente como pago', () => {
    expect(financialTotals([{ total_amount: 500, paid_amount: 500, payment_status: 'Pendente', beneficiary_type: 'Pessoal', allocated_amount: null }]).paid).toBe(0);
  });
  it('contabiliza apenas valor efetivamente pago em pagamento parcial', () => {
    expect(financialTotals([{ total_amount: 500, paid_amount: 200, payment_status: 'Parcialmente pago', beneficiary_type: 'Pessoal', allocated_amount: null }]).paid).toBe(200);
  });
  it('não atribui valor familiar integral à Rebeca', () => {
    expect(financialTotals([{ total_amount: 1000, paid_amount: 0, payment_status: 'Pendente', beneficiary_type: 'Compartilhada', allocated_amount: 250 }]).rebeca).toBe(250);
  });
  it('não inclui despesas canceladas nos totais', () => {
    expect(financialTotals([{ total_amount: 1000, paid_amount: 0, payment_status: 'Cancelado', beneficiary_type: 'Pessoal', allocated_amount: null }]).total).toBe(0);
  });
});
describe('Documentos privados', () => {
  it('aceita apenas imagens permitidas e PDFs', () => { expect(validateDocument({ size: 10, type: 'text/html' })).toBeTruthy(); expect(validateDocument({ size: 10, type: 'application/pdf' })).toBeNull(); });
  it('limita cada documento a 20 MB', () => { expect(validateDocument({ size: 20971520, type: 'image/jpeg' })).toBeNull(); expect(validateDocument({ size: 20971521, type: 'image/jpeg' })).toBeTruthy(); });
});