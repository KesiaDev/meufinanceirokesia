import { describe, expect, it } from 'vitest';
import { fixedExpenseDate, fixedExpenseDates, launchPlan, pendingMoves } from '@/lib/fixed-expenses';

describe('despesas fixas', () => {
  it('lança o aluguel de R$ 3.300,00 no dia 10 a partir de novembro de 2026', () => {
    const items = [{ id: 'aluguel', amount: 3300, due_day: 10 }];
    expect(launchPlan('2026-11', items, [], {}).map(p => [p.amount, p.date])).toEqual([[3300, '2026-11-10']]);
    expect(launchPlan('2026-12', items, [], {}).map(p => [p.amount, p.date])).toEqual([[3300, '2026-12-10']]);
  });
  it('usa o dia de vencimento, limitado ao fim do mês', () => {
    expect(fixedExpenseDate('2026-11', 15)).toBe('2026-11-15');
    expect(fixedExpenseDate('2026-02', 31)).toBe('2026-02-28');
    expect(fixedExpenseDate('2026-11', null)).toBe('2026-11-01');
  });
  it('lança só as que têm valor e ainda não foram lançadas no mês', () => {
    const items = [{ id: 'adyl', amount: 119.9 }, { id: 'claro', amount: 35 }, { id: 'gas', amount: null }, { id: 'condo', amount: null }];
    const plan = launchPlan('2026-11', items, ['claro|2026-11-01'], { gas: 98.5 });
    expect(plan.map(p => [p.item.id, p.amount, p.date])).toEqual([['adyl', 119.9, '2026-11-01'], ['gas', 98.5, '2026-11-01']]);
  });
  it('lança toda quarta-feira do mês, uma despesa por semana', () => {
    const dates = fixedExpenseDates('2026-11', { frequency: 'Semanal', weekday: 3 });
    expect(dates).toEqual(['2026-11-04', '2026-11-11', '2026-11-18', '2026-11-25']);
    const plan = launchPlan('2026-11', [{ id: 'psico', amount: 180, frequency: 'Semanal' as const, weekday: 3 }], ['psico|2026-11-04'], {});
    expect(plan.map(p => [p.amount, p.date])).toEqual([[180, '2026-11-11'], [180, '2026-11-18'], [180, '2026-11-25']]);
  });
  it('não lança de novo uma data já lançada e ignora conta sem valor', () => {
    const items = [{ id: 'psico', amount: 180, frequency: 'Semanal' as const, weekday: 3 }, { id: 'aluguel', amount: null }];
    const launched = ['psico|2026-11-04', 'psico|2026-11-11', 'psico|2026-11-18', 'psico|2026-11-25'];
    expect(launchPlan('2026-11', items, launched, {})).toEqual([]);
  });
  it('move a conta pendente lançada antes do dia de vencimento ser definido, em vez de duplicar', () => {
    const plan = launchPlan('2026-11', [{ id: 'claro', amount: 35, due_day: 20 }], [], {});
    const pending = [{ id: 'row-1', fixed_expense_id: 'claro', expense_date: '2026-11-01' }];
    const { moves, inserts } = pendingMoves(plan, pending);
    expect(moves).toEqual([{ row: pending[0], amount: 35, date: '2026-11-20' }]);
    expect(inserts).toEqual([]);
  });
  it('não move conta semanal nem lançamentos novos; move só com uma pendente', () => {
    const weeklyPlan = launchPlan('2026-11', [{ id: 'psico', amount: 180, frequency: 'Semanal' as const, weekday: 3 }], [], {});
    const weeklyPending = [{ id: 'row-a', fixed_expense_id: 'psico', expense_date: '2026-11-04' }];
    expect(pendingMoves(weeklyPlan, weeklyPending).moves).toEqual([]);
    const freshPlan = launchPlan('2026-11', [{ id: 'novo', amount: 50, due_day: 20 }], [], {});
    expect(pendingMoves(freshPlan, []).inserts).toEqual(freshPlan);
    const doublePlan = launchPlan('2026-11', [{ id: 'claro', amount: 35, due_day: 20 }], [], {});
    const twoPending = [{ id: 'row-1', fixed_expense_id: 'claro', expense_date: '2026-11-01' }, { id: 'row-2', fixed_expense_id: 'claro', expense_date: '2026-11-02' }];
    expect(pendingMoves(doublePlan, twoPending).moves).toEqual([]);
  });
});
