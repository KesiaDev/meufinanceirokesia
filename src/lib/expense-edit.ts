import { z } from 'zod';
import { beneficiaryInput } from './beneficiary';
import { isDocumentDate } from './document-review';

export const PAYMENT_STATUSES = ['Pendente', 'Pago', 'Parcialmente pago', 'Cancelado'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const expenseEditSchema = z.object({
  description: z.string().trim().min(1, 'Preencha a descrição.').max(1000),
  expense_date: z.string().refine(isDocumentDate, 'Data inválida.'),
  due_date: z.string().optional(),
  payment_date: z.string().refine(v => !v || isDocumentDate(v), 'Data de pagamento inválida.').optional(),
  total_amount: z.number().min(0).max(999999999999.99),
  category: z.string().trim().max(100),
  beneficiary: beneficiaryInput.nullable(),
  payment_status: z.enum(PAYMENT_STATUSES),
  paid_amount: z.number().min(0).max(999999999999.99),
}).refine(e => e.payment_status !== 'Parcialmente pago' || (e.paid_amount > 0 && e.paid_amount < e.total_amount), { message: 'No pagamento parcial, o valor pago deve ser maior que zero e menor que o total.', path: ['paid_amount'] });
export type ExpenseEdit = z.infer<typeof expenseEditSchema>;

/** Paid amount follows the status so totals never count an unpaid or cancelled expense as paid. */
export function paidAmountFor(status: PaymentStatus, total: number, paid: number) {
  return status === 'Pago' ? total : status === 'Parcialmente pago' ? Math.round(paid * 100) / 100 : 0;
}
