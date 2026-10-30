// Metas sugeridas por grupo, em % dos ganhos do mês (base: regra 50/30/20 adaptada a família com filha).
export const BUDGET_GROUPS = [
  { key: 'moradia', label: 'Moradia e contas da casa', pct: 30, categories: ['Aluguel', 'Contas da casa'] },
  { key: 'mercado', label: 'Mercado', pct: 12, categories: ['Mercado'] },
  { key: 'saude', label: 'Saúde e farmácia', pct: 10, categories: ['Saúde', 'Farmácia'] },
  { key: 'educacao', label: 'Escola e atividades', pct: 10, categories: ['Escola', 'Natação'] },
  { key: 'transporte', label: 'Transporte e gasolina', pct: 8, categories: ['Transporte', 'Gasolina'] },
  { key: 'lazer', label: 'Lazer e restaurantes', pct: 7, categories: ['Lazer', 'Restaurante'] },
  { key: 'outros', label: 'Roupas e outros', pct: 5, categories: ['Vestuário', 'Outros'] },
] as const;
export const SAVINGS_PCT = 18;

type Exp = { category: string | null; beneficiary_type: string; total_amount: number | string; payment_status: string };

export function groupOf(e: Exp): string {
  const g = BUDGET_GROUPS.find(g => (g.categories as readonly string[]).includes(e.category ?? ''));
  if (g) return g.key;
  return !e.category && e.beneficiary_type === 'Casa' ? 'moradia' : 'outros';
}

export function budgetPlan(income: number, expenses: Exp[]) {
  const incomeC = Math.round(income * 100);
  const spentBy: Record<string, number> = {};
  let spentC = 0;
  for (const e of expenses) {
    if (e.payment_status === 'Cancelado') continue;
    const c = Math.round(Number(e.total_amount) * 100); spentC += c;
    const k = groupOf(e); spentBy[k] = (spentBy[k] ?? 0) + c;
  }
  const groups = BUDGET_GROUPS.map(g => ({ key: g.key, label: g.label, pct: g.pct, ideal: Math.round(incomeC * g.pct / 100) / 100, spent: (spentBy[g.key] ?? 0) / 100 }));
  const ratio = incomeC ? spentC / incomeC : spentC ? Infinity : 0;
  const status = ratio <= 0.82 ? 'bem' : ratio <= 1 ? 'atencao' : 'alerta';
  return { groups, spent: spentC / 100, ratio, status, savingsIdeal: Math.round(incomeC * SAVINGS_PCT / 100) / 100 } as const;
}
