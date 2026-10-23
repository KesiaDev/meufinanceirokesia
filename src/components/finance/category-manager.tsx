import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, LoaderCircle, Tags, Sparkles, Pencil, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { createCategory, createSuggestedCategories } from '@/lib/categories.functions';
import { SUGGESTED_CATEGORIES } from '@/lib/beneficiary';
import { deleteCategory, renameCategory } from '@/lib/expenses.functions';
import { ConfirmDelete } from './confirm-delete';

export function CategoryManager({ categories, compact = false }: { categories: { id: string; name: string }[]; compact?: boolean }) {
  const [name, setName] = useState(''); const [busy, setBusy] = useState(false);
  const create = useServerFn(createCategory); const suggest = useServerFn(createSuggestedCategories); const query = useQueryClient();
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!name.trim() || busy) return; setBusy(true);
    try { const result = await create({ data: { name } });
      if (!result.ok) { toast.error(result.error); return; }
      await query.invalidateQueries({ queryKey: ['workspace'] }); setName(''); toast.success('Categoria criada.');
    } catch { toast.error('Não foi possível criar a categoria.'); } finally { setBusy(false); }
  }
  const missing = SUGGESTED_CATEGORIES.filter(s => !categories.some(c => c.name.trim().toLowerCase() === s.toLowerCase()));
  async function addSuggested() {
    if (busy) return; setBusy(true);
    try { const result = await suggest();
      if (!result.ok) { toast.error(result.error); return; }
      await query.invalidateQueries({ queryKey: ['workspace'] }); toast.success(`${result.created} categorias adicionadas.`);
    } catch { toast.error('Não foi possível criar as categorias sugeridas.'); } finally { setBusy(false); }
  }
  return <div className={compact ? '' : 'category-manager'}>
    {!compact && <h2 className="font-bold text-sm flex items-center gap-2"><Tags size={17}/>Minhas categorias</h2>}
    <form onSubmit={save} className="flex gap-2 flex-wrap mt-3">
      <input className="filter-select flex-1 min-w-0" aria-label="Nova categoria" placeholder="Nome da nova categoria" maxLength={100} value={name} disabled={busy} onChange={e => setName(e.target.value)}/>
      <Button type="submit" variant="outline" disabled={busy || !name.trim()}>{busy ? <LoaderCircle className="animate-spin"/> : <Plus/>}Criar categoria</Button>
    </form>
    {missing.length > 0 && <Button type="button" variant="link" size="sm" className="px-0 mt-1" disabled={busy} onClick={addSuggested} title={missing.join(', ')}><Sparkles/>Adicionar sugeridas: {missing.slice(0, 3).join(', ')}{missing.length > 3 ? ` e mais ${missing.length - 3}` : ''}</Button>}
    {!compact && <div className="flex flex-wrap gap-2 mt-4">{categories.length ? categories.map(c => <CategoryChip key={c.id} category={c}/>) : <p className="text-xs text-muted-foreground">Nenhuma categoria criada.</p>}</div>}
  </div>;
}

function CategoryChip({ category }: { category: { id: string; name: string } }) {
  const rename = useServerFn(renameCategory); const remove = useServerFn(deleteCategory); const query = useQueryClient();
  const [editing, setEditing] = useState(false); const [name, setName] = useState(category.name); const [busy, setBusy] = useState(false); const [removing, setRemoving] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!name.trim() || busy) return; setBusy(true);
    try { const result = await rename({ data: { id: category.id, name } });
      if (!result.ok) { toast.error(result.error); return; }
      await query.invalidateQueries({ queryKey: ['workspace'] }); setEditing(false); toast.success('Categoria renomeada.');
    } catch { toast.error('Não foi possível renomear a categoria.'); } finally { setBusy(false); }
  }
  if (editing) return <form onSubmit={save} className="flex items-center gap-1"><input className="filter-select h-8 w-40" aria-label={`Novo nome de ${category.name}`} autoFocus maxLength={100} value={name} disabled={busy} onChange={e => setName(e.target.value)}/><Button type="submit" variant="ghost" size="icon" className="h-8 w-8" disabled={busy || !name.trim()} title="Salvar nome" aria-label="Salvar nome">{busy ? <LoaderCircle className="animate-spin"/> : <Check/>}</Button><Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={busy} title="Cancelar" aria-label="Cancelar" onClick={() => { setEditing(false); setName(category.name); }}><X/></Button></form>;
  return <span className="category-label inline-flex items-center gap-1">{category.name}
    <button type="button" className="opacity-60 hover:opacity-100" title="Renomear categoria" aria-label={`Renomear ${category.name}`} onClick={() => setEditing(true)}><Pencil size={12}/></button>
    <button type="button" className="opacity-60 hover:opacity-100 text-destructive" title="Excluir categoria" aria-label={`Excluir ${category.name}`} onClick={() => setRemoving(true)}><Trash2 size={12}/></button>
    {removing && <ConfirmDelete title="Excluir categoria?" description={`As despesas em "${category.name}" ficarão sem categoria. Elas não serão apagadas.`} onClose={() => setRemoving(false)} onConfirm={async () => {
      try { const result = await remove({ data: { id: category.id } }); if (!result.ok) { toast.error(result.error); return false; } await query.invalidateQueries({ queryKey: ['workspace'] }); toast.success('Categoria excluída.'); return true; }
      catch { toast.error('Não foi possível excluir a categoria.'); return false; }
    }}/>}
  </span>;
}
