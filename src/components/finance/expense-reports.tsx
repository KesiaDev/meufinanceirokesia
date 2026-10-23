import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartNoAxesCombined } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { currency } from '@/lib/finance';
import { expenseReport, UNCATEGORIZED } from '@/lib/expense-reports';
import type { Tables } from '@/integrations/supabase/types';
import { CategoryManager } from './category-manager';
import { ExpenseTable } from './expense-table';

export function ExpenseCharts({ report }: { report: ReturnType<typeof expenseReport> }) {
  const [mode, setMode] = useState<'monthly' | 'categories'>('monthly');
  return <section className="report-chart-section"><div className="flex flex-wrap items-center justify-between gap-3 mb-6"><h2 className="font-bold">{mode === 'monthly' ? 'Despesas por mês' : 'Despesas por categoria'}</h2><div className="flex gap-1"><Button variant={mode === 'monthly' ? 'default' : 'outline'} size="sm" onClick={() => setMode('monthly')} aria-pressed={mode === 'monthly'}>Mês</Button><Button variant={mode === 'categories' ? 'default' : 'outline'} size="sm" onClick={() => setMode('categories')} aria-pressed={mode === 'categories'}>Categoria</Button></div></div>
    {report.rows.length ? <div className="report-chart" role="img" aria-label={mode === 'monthly' ? 'Gráfico de despesas por mês' : 'Gráfico de despesas por categoria'}><ResponsiveContainer width="100%" height="100%"><BarChart data={mode === 'monthly' ? report.monthly : report.categories} margin={{ top: 12, right: 10, bottom: 12, left: 0 }}><CartesianGrid stroke="var(--border)" vertical={false}/><XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} interval="preserveStartEnd"/><YAxis width={65} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} tickFormatter={n => new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(n)}/><Tooltip formatter={value => currency(Number(value))} contentStyle={{ background: 'var(--card)', borderColor: 'var(--border)', borderRadius: 6 }} cursor={{ fill: 'var(--muted)' }}/><Bar dataKey="total" name="Despesas" fill={mode === 'monthly' ? 'var(--primary)' : 'var(--success)'} radius={[4,4,0,0]} maxBarSize={48} isAnimationActive={false}/></BarChart></ResponsiveContainer></div> : <div className="empty-state"><ChartNoAxesCombined className="mx-auto mb-3"/><h3>Nenhuma despesa neste período</h3></div>}
  </section>;
}

export function ExpenseReports({ expenses, categories }: { expenses: Tables<'expenses'>[]; categories: Tables<'expense_categories'>[] }) {
  const currentYear = new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(new Date());
  const [year, setYear] = useState(currentYear); const [month, setMonth] = useState(''); const [category, setCategory] = useState('');
  const years = [...new Set([currentYear, ...expenses.map(e => e.expense_date.slice(0,4))])].sort().reverse();
  const categoryNames = [...new Set([...categories.map(c => c.name), ...expenses.map(e => e.category || UNCATEGORIZED)])].sort();
  const report = expenseReport(expenses, { year, month, category });
  return <><div className="report-filters"><label>Ano<select className="filter-select" aria-label="Ano do relatório" value={year} onChange={e => setYear(e.target.value)}>{years.map(y => <option key={y}>{y}</option>)}</select></label><label>Mês<select className="filter-select" aria-label="Mês do relatório" value={month} onChange={e => setMonth(e.target.value)}><option value="">Todos os meses</option>{['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m,i) => <option key={m} value={String(i+1).padStart(2,'0')}>{m}</option>)}</select></label><label>Categoria<select className="filter-select" aria-label="Categoria do relatório" value={category} onChange={e => setCategory(e.target.value)}><option value="">Todas as categorias</option>{categoryNames.map(c => <option key={c}>{c}</option>)}</select></label></div>
    <div className="report-total"><span>Total de despesas · {year}</span><strong>{currency(report.total)}</strong><span>{report.rows.length} registros</span></div>
    <ExpenseCharts report={report}/>
    <section className="report-summary"><h2 className="font-bold mb-4">Resumo por categoria</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>CATEGORIA</th><th>DESPESAS</th><th>TOTAL</th></tr></thead><tbody>{report.categories.map(c => <tr key={c.name}><td>{c.name}</td><td>{c.count}</td><td>{currency(c.total)}</td></tr>)}</tbody></table></div></section>
    {report.rows.length > 0 && <section className="report-summary"><h2 className="font-bold mb-4">Despesas do período</h2><ExpenseTable expenses={report.rows} categories={categories}/></section>}
    <CategoryManager categories={categories}/>
  </>;
}