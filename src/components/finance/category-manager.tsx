import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, LoaderCircle, Tags } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { createCategory } from '@/lib/categories.functions';

export function CategoryManager({ categories, compact = false }: { categories: { id: string; name: string }[]; compact?: boolean }) {
  const [name, setName] = useState(''); const [busy, setBusy] = useState(false);
  const create = useServerFn(createCategory); const query = useQueryClient();
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!name.trim() || busy) return; setBusy(true);
    try { const result = await create({ data: { name } });
      if (!result.ok) { toast.error(result.error); return; }
      await query.invalidateQueries({ queryKey: ['workspace'] }); setName(''); toast.success('Categoria criada.');
    } catch { toast.error('Não foi possível criar a categoria.'); } finally { setBusy(false); }
  }
  return <div className={compact ? '' : 'category-manager'}>
    {!compact && <h2 className="font-bold text-sm flex items-center gap-2"><Tags size={17}/>Minhas categorias</h2>}
    <form onSubmit={save} className="flex gap-2 flex-wrap mt-3">
      <input className="filter-select flex-1 min-w-0" aria-label="Nova categoria" placeholder="Nome da nova categoria" maxLength={100} value={name} disabled={busy} onChange={e => setName(e.target.value)}/>
      <Button type="submit" variant="outline" disabled={busy || !name.trim()}>{busy ? <LoaderCircle className="animate-spin"/> : <Plus/>}Criar categoria</Button>
    </form>
    {!compact && <div className="flex flex-wrap gap-2 mt-4">{categories.length ? categories.map(c => <span key={c.id} className="category-label">{c.name}</span>) : <p className="text-xs text-muted-foreground">Nenhuma categoria criada.</p>}</div>}
  </div>;
}