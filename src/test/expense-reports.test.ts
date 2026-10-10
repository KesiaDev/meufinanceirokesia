import { describe, expect, it } from 'vitest';
import { expenseReport } from '@/lib/expense-reports';
const rows = [
  {expense_date:'2026-10-01',category:'Escola',total_amount:120,payment_status:'Pendente'},
  {expense_date:'2026-11-02',category:'Saúde',total_amount:80,payment_status:'Pago'},
  {expense_date:'2025-10-01',category:'Escola',total_amount:300,payment_status:'Pago'},
  {expense_date:'2026-10-03',category:'Escola',total_amount:999,payment_status:'Cancelado'},
  {expense_date:'2026-10-04',category:null,total_amount:0.1,payment_status:'Pendente'},
  {expense_date:'2026-10-05',category:null,total_amount:0.2,payment_status:'Pendente'},
];
describe('Relatórios de despesas',()=>{
  it('filtra despesas por ano',()=>expect(expenseReport(rows,{year:'2025',month:'',category:''}).total).toBe(300));
  it('filtra despesas por mês',()=>expect(expenseReport(rows,{year:'2026',month:'11',category:''}).total).toBe(80));
  it('filtra categorias próprias',()=>expect(expenseReport(rows,{year:'2026',month:'10',category:'Escola'}).total).toBe(120));
  it('exclui despesas canceladas',()=>expect(expenseReport(rows.filter(r=>r.payment_status==='Cancelado'),{year:'2026',month:'',category:''}).rows).toHaveLength(0));
  it('mantém valores do gráfico iguais ao relatório',()=>{
    const report=expenseReport(rows,{year:'2026',month:'',category:''});
    expect(report.total).toBe(200.3);expect(report.monthly[9]?.total).toBe(120.3);expect(report.monthly[10]?.total).toBe(80);
    expect(report.categories.find(c=>c.name==='Sem categoria')?.total).toBe(0.3);
  });
});