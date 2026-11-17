import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Camera, Paperclip, Plus, Trash2, Eye, Download, Plane, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { validateDocument } from '@/lib/finance';
import { travelTotals, travelCsv, type TravelPerson } from '@/lib/travel';
import type { Tables } from '@/integrations/supabase/types';

type Item = Tables<'travel_expenses'>;
const money = (v: number, c: string) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: c }).format(v);

export function TravelExpenses({ items, userId }: { items: Item[]; userId: string }) {
  const [person, setPerson] = useState<TravelPerson>('Késia');
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient(); const file = useRef<HTMLInputElement>(null); const cam = useRef<HTMLInputElement>(null);
  const rows = items.filter(i => i.person === person); const t = travelTotals(rows);
  const refresh = () => qc.invalidateQueries({ queryKey: ['workspace'] });

  async function add(f?: File) {
    if (f) { const bad = validateDocument(f); if (bad) { toast.error(bad); return; } }
    setBusy(true);
    try {
      let file_path: string | null = null;
      if (f) {
        const ext = f.type === 'application/pdf' ? 'pdf' : f.type === 'image/png' ? 'png' : f.type === 'image/webp' ? 'webp' : 'jpg';
        file_path = `${userId}/viagem/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('financial-documents').upload(file_path, f, { contentType: f.type });
        if (error) throw error;
      }
      const { error } = await supabase.from('travel_expenses').insert({ user_id: userId, person, file_path, mime_type: f?.type ?? null });
      if (error) throw error;
      await refresh(); toast.success('Despesa adicionada. Preencha o que foi e o valor.');
    } catch { toast.error('Não foi possível guardar. Tente novamente.'); }
    finally { setBusy(false); if (file.current) file.current.value = ''; if (cam.current) cam.current.value = ''; }
  }
  async function update(id: string, patch: Partial<Item>) {
    const { error } = await supabase.from('travel_expenses').update(patch).eq('id', id).eq('user_id', userId);
    if (error) toast.error('Não foi possível salvar.'); else await refresh();
  }
  async function remove(i: Item) {
    if (!confirm('Excluir esta despesa da viagem?')) return;
    const { error } = await supabase.from('travel_expenses').delete().eq('id', i.id).eq('user_id', userId);
    if (error) { toast.error('Não foi possível excluir.'); return; }
    if (i.file_path) await supabase.storage.from('financial-documents').remove([i.file_path]);
    await refresh();
  }
  async function open(i: Item) {
    if (!i.file_path) return;
    const { data, error } = await supabase.storage.from('financial-documents').createSignedUrl(i.file_path, 300);
    if (error) toast.error('Não foi possível abrir o comprovante.'); else window.open(data.signedUrl, '_blank', 'noopener');
  }
  async function attach(i: Item, f: File) {
    const bad = validateDocument(f); if (bad) { toast.error(bad); return; }
    const ext = f.type === 'application/pdf' ? 'pdf' : f.type === 'image/png' ? 'png' : f.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${userId}/viagem/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('financial-documents').upload(path, f, { contentType: f.type });
    if (error) { toast.error('Não foi possível anexar.'); return; }
    await update(i.id, { file_path: path, mime_type: f.type });
  }
  function exportCsv() {
    const blob = new Blob(['\ufeff' + travelCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `viagem-portugal-${person.toLowerCase().replace('é', 'e')}.csv`; a.click();
  }

  return <>
    <div className="travel-tabs" role="tablist">{(['Késia', 'Gisele'] as const).map(p => <button key={p} role="tab" aria-selected={person === p} className={`travel-tab ${person === p ? 'active' : ''}`} onClick={() => setPerson(p)}><Plane size={15} />{p}<span>{items.filter(i => i.person === p).length}</span></button>)}</div>
    <div className="stat-grid">
      <article className="stat"><div className="stat-top"><span>Total em euros</span></div><div className="stat-value">{money(t.EUR, 'EUR')}</div><p className="stat-caption">{rows.length} despesas de {person}</p></article>
      <article className="stat"><div className="stat-top"><span>Total em reais</span></div><div className="stat-value">{money(t.BRL, 'BRL')}</div><p className="stat-caption">Gastos pagos em R$</p></article>
      <article className="stat"><div className="stat-top"><span>Sem comprovante</span></div><div className="stat-value">{String(rows.filter(r => !r.file_path).length).padStart(2, '0')}</div><p className="stat-caption">Anexe antes de enviar</p></article>
    </div>
    <input ref={cam} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => e.target.files?.[0] && add(e.target.files[0])} />
    <input ref={file} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={e => e.target.files?.[0] && add(e.target.files[0])} />
    <div className="flex flex-wrap gap-2 mb-4">
      <Button disabled={busy} onClick={() => cam.current?.click()}>{busy ? <LoaderCircle className="animate-spin" /> : <Camera />}Tirar foto</Button>
      <Button variant="outline" disabled={busy} onClick={() => file.current?.click()}><Paperclip />Anexar arquivo</Button>
      <Button variant="outline" disabled={busy} onClick={() => add()}><Plus />Anotar sem foto</Button>
      <Button variant="ghost" disabled={!rows.length} onClick={exportCsv}><Download />Baixar planilha para a empresa</Button>
    </div>
    <section className="data-panel">
      {rows.length ? <div className="travel-list">{rows.map(i => <div key={i.id} className="travel-row">
        <input aria-label="O que foi" className="filter-select travel-desc" defaultValue={i.description} placeholder="O que foi? (ex.: táxi aeroporto)" onBlur={e => e.target.value !== i.description && update(i.id, { description: e.target.value })} />
        <input aria-label="Data" type="date" className="filter-select" defaultValue={i.expense_date} onBlur={e => e.target.value && e.target.value !== i.expense_date && update(i.id, { expense_date: e.target.value })} />
        <input aria-label="Valor" type="number" step="0.01" min="0" className="filter-select travel-amount" defaultValue={Number(i.amount) || ''} placeholder="0,00" onBlur={e => Number(e.target.value || 0) !== Number(i.amount) && update(i.id, { amount: Number(e.target.value || 0) })} />
        <select aria-label="Moeda" className="filter-select" value={i.currency} onChange={e => update(i.id, { currency: e.target.value })}><option value="EUR">€</option><option value="BRL">R$</option></select>
        <input aria-label="Observação" className="filter-select travel-desc" defaultValue={i.notes} placeholder="Observação" onBlur={e => e.target.value !== i.notes && update(i.id, { notes: e.target.value })} />
        <div className="flex">
          {i.file_path ? <Button variant="ghost" size="icon" title="Ver comprovante" aria-label="Ver comprovante" onClick={() => open(i)}><Eye /></Button>
            : <label className="travel-attach" title="Anexar comprovante"><Paperclip size={16} /><input type="file" className="hidden" accept="image/*,application/pdf" onChange={e => e.target.files?.[0] && attach(i, e.target.files[0])} /></label>}
          <Button variant="ghost" size="icon" title="Excluir" aria-label="Excluir" onClick={() => remove(i)}><Trash2 className="text-destructive" /></Button>
        </div>
      </div>)}</div>
        : <div className="empty-state"><div className="empty-icon"><Plane size={23} /></div><h3>Nenhuma despesa de {person} ainda</h3><p>Tire uma foto do recibo e anote o que foi e o valor.</p></div>}
    </section>
  </>;
}
