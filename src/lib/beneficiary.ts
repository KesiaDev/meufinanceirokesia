import { z } from 'zod';
export const UNCLASSIFIED = 'Pendente de classificação';
export const BENEFICIARIES = [
  { value: 'Pessoal', label: 'Minha' },
  { value: 'Casa', label: 'Casa' },
  { value: 'Direta da Rebeca', label: 'Rebeca' },
  { value: 'Compartilhada', label: 'Dividida com a Rebeca' },
] as const;
export type BeneficiaryType = (typeof BENEFICIARIES)[number]['value'];
export const BENEFICIARY_VALUES = BENEFICIARIES.map(b => b.value) as [BeneficiaryType, ...BeneficiaryType[]];
export const beneficiaryLabel = (value: string) => BENEFICIARIES.find(b => b.value === value)?.label ?? 'A classificar';

export const SUGGESTED_CATEGORIES = ['Mercado', 'Aluguel', 'Gasolina', 'Contas da casa', 'Farmácia', 'Saúde', 'Escola', 'Restaurante', 'Vestuário', 'Lazer', 'Transporte', 'Outros'];

export function allocation(type: BeneficiaryType, total: number, percentage?: number | null) {
  if (type !== 'Compartilhada') return { beneficiary_type: type, allocation_percentage: null, allocated_amount: null, allocation_method: null };
  const pct = Math.min(100, Math.max(0, percentage ?? 50));
  return { beneficiary_type: type, allocation_percentage: pct, allocated_amount: Math.round(total * pct) / 100, allocation_method: 'Percentual' };
}

export function rebecaShare(e: { total_amount: number; beneficiary_type: string; allocated_amount: number | null }) {
  return e.beneficiary_type === 'Direta da Rebeca' ? Number(e.total_amount) : e.beneficiary_type === 'Compartilhada' ? Number(e.allocated_amount ?? 0) : 0;
}
export const beneficiaryInput = z.object({ type: z.enum(BENEFICIARY_VALUES), percentage: z.number().min(0).max(100).nullable().optional() });
export type BeneficiaryInput = z.infer<typeof beneficiaryInput>;
