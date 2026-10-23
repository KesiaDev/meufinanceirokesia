import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { classifyBeneficiary, classifyExpense } from '@/lib/categories.functions';
import { BENEFICIARY_VALUES, rebecaShare, type BeneficiaryType } from '@/lib/beneficiary';
import { currency, dateLabel } from '@/lib/finance';
import type { Tables } from '@/integrations/supabase/types';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deleteExpense } from '@/lib/expenses.functions';
import { BeneficiaryPicker, type BeneficiaryChoice } from './beneficiary-picker';
import { ExpenseEditDialog } from './expense-edit-dialog';
import { ConfirmDelete } from './confirm-delete';

const choiceOf = (e: Tables<'expenses'>): BeneficiaryChoice => ({ type: (BENEFICIARY_VALUES as readonly string[]).includes(e.beneficiary_type) ? e.beneficiary_type as BeneficiaryType : '', percentage: Number(e.allocation_percentage ?? 50) });

export function ExpenseTable({ expenses, categories, showRebecaShare = false }: { expenses: Tables<'expenses'>[]; categories: Tables<'expense_categories'>[]; showRebecaShare?: boolean }) {
  const classify = useServerFn(classifyExpense); const assign = useServerFn(classifyBeneficiary); const query = useQueryClient();
  const remove = useServerFn(deleteExpense);
  const [editing, setEditing] = useState<Tables<'expenses'> | null>(null); const [removing, setRemoving] = useState<Tables<'expenses'> | null>(null);
  const [busy, setBusy] = useState<string | null>(null); const [drafts, setDrafts] = useState<Record<string, BeneficiaryChoice>>({});
  async function run(id: string, action: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(id);
    try { const result = await action(); if (!result.ok) toast.error(result.error ?? 'Não foi possível classificar a despesa.'); else await query.invalidateQueries({ queryKey: ['workspace'] }); }
    catch { toast.error('Não foi possível classificar a despesa.'); }
    finally { setBusy(null); setDrafts(d => { const { [id]: _, ...rest } = d; return rest; }); }
  }
  function changeBeneficiary(e: Tables<'expenses'>, value: BeneficiaryChoice) {
    const previous = drafts[e.id] ?? choiceOf(e);
    setDrafts(d => ({ ...d, [e.id]: value }));
    // Percentage edits are saved on blur; only a change of type is saved right away.
    if (value.type && value.type !== previous.type) void run(e.id, () => assign({ data: { id: e.id, beneficiary: { type: value.type as BeneficiaryType, percentage: value.percentage } } }));
  }
  function commitPercentage(e: Tables<'expenses'>) {
    const draft = drafts[e.id];
    if (draft?.type === 'Compartilhada' && draft.percentage !== Number(e.allocation_percentage)) void run(e.id, () => assign({ data: { id: e.id, beneficiary: { type: 'Compartilhada', percentage: draft.percentage } } }));
  }
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>DESCRIÇÃO</th><th>DATA</th><th>CATEGORIA</th><th>PARA QUEM</th><th>VALOR</th>{showRebecaShare && <th>PARTE DA REBECA</th>}<th>PAGAMENTO</th><th/></tr></thead><tbody>
    {expenses.map(e => <tr key={e.id}>
      <td>{e.description}</td>
      <td className="whitespace-nowrap">{dateLabel(e.expense_date)}</td>
      <td><select className="filter-select max-w-40" aria-label={`Categoria de ${e.description}`} value={e.category || ''} disabled={busy !== null} onChange={event => run(e.id, () => classify({ data: { id: e.id, category: event.target.value } }))}><option value="">Sem categoria</option>{e.category && !categories.some(c => c.name === e.category) && <option>{e.category}</option>}{categories.map(c => <option key={c.id}>{c.name}</option>)}</select></td>
      <td><BeneficiaryPicker id={`beneficiary-${e.id}`} compact value={drafts[e.id] ?? choiceOf(e)} disabled={busy !== null} onChange={value => changeBeneficiary(e, value)} onPercentageCommit={() => commitPercentage(e)}/></td>
      <td className="whitespace-nowrap">{currency(Number(e.total_amount))}</td>
      {showRebecaShare && <td className="whitespace-nowrap">{currency(rebecaShare(e))}</td>}
      <td>{e.payment_status}</td>
      <td><div className="flex"><Button variant="ghost" size="icon" title="Editar despesa" aria-label={`Editar ${e.description}`} onClick={() => setEditing(e)}><Pencil/></Button><Button variant="ghost" size="icon" title="Excluir despesa" aria-label={`Excluir ${e.description}`} onClick={() => setRemoving(e)}><Trash2 className="text-destructive"/></Button></div></td>
    </tr>)}
  </tbody></table>
  {editing && <ExpenseEditDialog key={editing.id} expense={editing} categories={categories} onClose={() => setEditing(null)}/>}
  {removing && <ConfirmDelete title="Excluir despesa?" description={`"${removing.description}" — ${currency(Number(removing.total_amount))} será excluída dos seus totais. ${removing.document_id ? 'A nota continua guardada em Meus documentos.' : ''}`} onClose={() => setRemoving(null)} onConfirm={async () => {
    try { const result = await remove({ data: { id: removing.id } }); if (!result.ok) { toast.error(result.error); return false; } await query.invalidateQueries({ queryKey: ['workspace'] }); toast.success('Despesa excluída.'); return true; }
    catch { toast.error('Não foi possível excluir a despesa.'); return false; }
  }}/>}
  </div>;
}
