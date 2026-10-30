import { describe, expect, it } from 'vitest';
import { fixedExpenseDate, launchPlan } from '@/lib/fixed-expenses';

describe('despesas fixas', () => {
  it('usa o dia de vencimento, limitado ao fim do mês', () => {
    expect(fixedExpenseDate('2026-11', 15)).toBe('2026-11-15');
    expect(fixedExpenseDate('2026-02', 31)).toBe('2026-02-28');
    expect(fixedExpenseDate('2026-11', null)).toBe('2026-11-01');
  });
  it('lança só as que têm valor e ainda não foram lançadas no mês', () => {
    const items = [{ id: 'adyl', amount: 119.9 }, { id: 'claro', amount: 35 }, { id: 'gas', amount: null }, { id: 'condo', amount: null }];
    const plan = launchPlan(items, ['claro'], { gas: 98.5 });
    expect(plan.map(p => [p.item.id, p.amount])).toEqual([['adyl', 119.9], ['gas', 98.5]]);
  });
});
