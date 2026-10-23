import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, LoaderCircle, Tags, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { createCategory, createSuggestedCategories } from '@/lib/categories.functions';
import { SUGGESTED_CATEGORIES } from '@/lib/beneficiary';

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
    {!compact && <div className="flex flex-wrap gap-2 mt-4">{categories.length ? categories.map(c => <span key={c.id} className="category-label">{c.name}</span>) : <p className="text-xs text-muted-foreground">Nenhuma categoria criada.</p>}</div>}
  </div>;
}