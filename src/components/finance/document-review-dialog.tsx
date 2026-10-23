import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, Check, Eye, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { confirmDocument } from '@/lib/document-review.functions';
import { extractionSchema, reviewSchema, canCreateExpense, shouldRegisterExpense, isDocumentDate, type DocumentReview } from '@/lib/document-review';
import type { Tables } from '@/integrations/supabase/types';
import { CategoryManager } from './category-manager';
import { BeneficiaryPicker, type BeneficiaryChoice } from './beneficiary-picker';
import { beneficiaryLabel, BENEFICIARY_VALUES, type BeneficiaryType } from '@/lib/beneficiary';
import { updateReviewedDocument } from '@/lib/expenses.functions';
import { dateLabel, todayISO } from '@/lib/finance';

export function DocumentReviewDialog({doc,expense,categories,onClose,onPreview}:{doc:Tables<'documents'>;expense?:Tables<'expenses'>|undefined;categories:Tables<'expense_categories'>[];onClose:()=>void;onPreview:()=>void}) {
 const confirm=useServerFn(confirmDocument);const updateDoc=useServerFn(updateReviewedDocument);const query=useQueryClient();
 const parsed=extractionSchema.safeParse(doc.ai_extraction);const ai=parsed.success?parsed.data:null;
 const saved=reviewSchema.safeParse(doc.reviewed_data);
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [createExpense,setCreateExpense]=useState(true);const manual=true;
 const [review,setReview]=useState<DocumentReview>(saved.success?saved.data:{document_type:doc.reviewed_at?doc.document_type:ai?.document_type??'Nota/recibo',kind:ai?.kind??'expense',issuer:doc.reviewed_at?doc.issuer??'':ai?.issuer??'',document_date:doc.reviewed_at?doc.document_date??'':ai?.document_date??'',due_date:doc.reviewed_at?doc.due_date??'':ai?.due_date??'',total_amount:doc.reviewed_at?doc.total_amount:ai?.total_amount??null,currency:ai?.currency??'BRL',description:ai?.description??'',notes:doc.notes});
 const completed=Boolean(doc.reviewed_at);const eligible=canCreateExpense(review,ai?.kind);const canRegister=shouldRegisterExpense(review,ai?.kind,doc.confirmed_expense_id);
  const [expenseDate,setExpenseDate]=useState(expense?.expense_date??todayISO());const [beneficiary,setBeneficiary]=useState<BeneficiaryChoice>({type:expense&&(BENEFICIARY_VALUES as readonly string[]).includes(expense.beneficiary_type)?expense.beneficiary_type as BeneficiaryType:'',percentage:Number(expense?.allocation_percentage??50)});
  const [category,setCategory]=useState(saved.success?saved.data.category??'':doc.preferred_category??(categories.some(c=>c.name===ai?.suggested_category)?ai?.suggested_category??'':''));
   async function save(){
    const linked=Boolean(doc.confirmed_expense_id);const creating=!linked&&createExpense&&eligible;
    if((creating||linked)&&!beneficiary.type){setError('Escolha para quem é este gasto: Minha, Casa, Rebeca ou Dividida com a Rebeca.');return;}
    if((creating||linked)&&!isDocumentDate(expenseDate)){setError('Informe o mês da despesa.');return;}
    const fullReview={...review,category,source:manual?'manual' as const:'ai' as const};const chosen=beneficiary.type?{type:beneficiary.type,percentage:beneficiary.percentage}:undefined;
    setBusy(true);setError('');
    try{
     if(completed){const updated=await updateDoc({data:{id:doc.id,review:fullReview,beneficiary:chosen??null,expenseDate}});if(!updated.ok){setError(updated.error);await query.invalidateQueries({queryKey:['workspace']});return;}}
     if(!completed||creating){const result=await confirm({data:{id:doc.id,review:fullReview,createExpense:creating,beneficiary:chosen,expenseDate}});if(!result.ok){setError(result.error);await query.invalidateQueries({queryKey:['workspace']});return;}}
     await query.invalidateQueries({queryKey:['workspace']});
     const summary=`${beneficiary.type?` · ${beneficiaryLabel(beneficiary.type)}`:''}${expenseDate?` · ${dateLabel(expenseDate)}`:''}`;
     toast.success(creating?`Despesa registrada${summary}`:linked?`Alterações salvas na nota e na despesa${summary}`:completed?'Alterações salvas.':'Revisão guardada.');onClose();
    }catch{setError('Não foi possível guardar. Confira os campos preenchidos.');}finally{setBusy(false);}
   }
 function field(key:'issuer'|'document_date'|'due_date'|'description'|'document_type'|'currency',label:string,type='text') {const uncertain=ai?.uncertain_fields.includes(key)&&!completed;return <div className="field mt-0"><label htmlFor={`review-${key}`} className={uncertain?'text-warning':''}>{label}{uncertain?' · conferir':''}</label><input id={`review-${key}`} type={type} value={review[key]} disabled={busy} onChange={e=>setReview({...review,[key]:e.target.value})}/></div>;}
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="sm:max-w-3xl max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{completed?'Editar documento':'Registrar despesa'}</DialogTitle><DialogDescription className="break-all">{doc.original_filename}</DialogDescription></DialogHeader><div className="flex flex-wrap items-center gap-3"><Button variant="outline" size="sm" onClick={onPreview}><Eye/>Ver original</Button>{ai&&<span className="text-xs text-muted-foreground">Confiança estimada: {Math.round(ai.confidence*100)}%</span>}</div>
  <div className="field mt-0"><label htmlFor="document-category">Categoria</label><select id="document-category" className="filter-select" value={category} disabled={busy} onChange={e=>setCategory(e.target.value)}><option value="">Sem categoria</option>{category&&!categories.some(c=>c.name===category)&&<option>{category}</option>}{categories.map(c=><option key={c.id}>{c.name}</option>)}</select></div>
  {!busy&&<CategoryManager categories={categories} compact/>}
  {(review.kind==='expense'||Boolean(doc.confirmed_expense_id))&&<div className="field mt-0"><label htmlFor="review-beneficiary">Para quem é este gasto?</label><BeneficiaryPicker id="review-beneficiary" value={beneficiary} onChange={setBeneficiary} disabled={busy}/></div>}
   <>
   {manual&&<div className="field mt-0"><label htmlFor="review-kind">Tipo de registro</label><select id="review-kind" className="filter-select" value={review.kind} disabled={busy} onChange={e=>setReview({...review,kind:e.target.value as DocumentReview['kind']})}><option value="expense">Despesa — nota, recibo ou conta</option><option value="statement">Fatura ou extrato</option><option value="payment">Comprovante de pagamento</option><option value="other">Outro documento</option></select></div>}
  {ai&&ai.warnings.length>0&&<div className="p-3 rounded-md bg-warning-soft text-warning text-xs space-y-2"><AlertTriangle size={16}/>{ai.warnings.map((w,i)=><p key={i}>{w}</p>)}</div>}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{field('document_type','Tipo do documento')}{field('issuer','Emissor')}{field('document_date','Data de emissão','date')}{field('due_date','Vencimento','date')}<div className="field mt-0"><label htmlFor="review-amount" className={ai?.uncertain_fields.includes('total_amount')?'text-warning':''}>Valor total{ai?.uncertain_fields.includes('total_amount')?' · conferir':''}</label><input id="review-amount" type="number" min="0" step="0.01" value={review.total_amount??''} disabled={busy} onChange={e=>setReview({...review,total_amount:e.target.value===''?null:Number(e.target.value)})}/></div>{field('currency','Moeda')}{field('description','Descrição / para que serve')}</div>{(review.kind==='expense'||Boolean(doc.confirmed_expense_id))&&<div className="field mt-0"><label htmlFor="review-expense-date">Mês da despesa</label><input id="review-expense-date" type="date" value={expenseDate} disabled={busy} onChange={e=>setExpenseDate(e.target.value)}/><p className="text-xs text-muted-foreground mt-1">A despesa conta no mês desta data (hoje, por padrão). As datas de emissão e vencimento continuam guardadas na nota.</p></div>}
 <div className="field mt-0"><label htmlFor="review-notes">Observações</label><textarea id="review-notes" value={review.notes} disabled={busy} onChange={e=>setReview({...review,notes:e.target.value})}/></div>
  {ai&&<details className="border-t border-border pt-3 text-xs"><summary className="cursor-pointer font-semibold">Texto e detalhes extraídos</summary><div className="mt-3 space-y-2 text-muted-foreground"><p>Número: {ai.document_number??'Não identificado'} · Forma de pagamento: {ai.payment_method??'Não identificada'}</p><p>Beneficiário: {ai.beneficiary??'Não identificado'} · Categoria sugerida: {ai.suggested_category??'Não identificada'}</p>{ai.items.map((item,i)=><p key={i}>{item.description} · Quantidade: {item.quantity??'—'} · Valor unitário: {item.unit_amount??'—'} · Total: {item.total_amount??'—'}</p>)}<pre className="whitespace-pre-wrap break-words font-sans max-h-64 overflow-auto">{ai.extracted_text||'Nenhum texto legível.'}</pre></div></details>}
  {!doc.confirmed_expense_id&&<><label className="flex gap-3 items-start text-sm border-t border-border pt-4"><input type="checkbox" className="mt-1 accent-primary" checked={createExpense&&eligible} disabled={!eligible||busy} onChange={e=>setCreateExpense(e.target.checked)}/><span>Registrar também uma despesa pendente{!eligible&&<span className="block text-xs text-muted-foreground mt-1">{['statement','payment'].includes(ai?.kind??review.kind)?'Faturas e comprovantes permanecem como documentos, sem duplicar compras.':'Preencha descrição, data de emissão e valor em BRL.'}</span>}</span></label><p className="text-xs text-muted-foreground">Nenhum pagamento será confirmado automaticamente.</p>{error&&<p role="alert" className="inline-error">{error}</p>}<Button disabled={busy} onClick={save}>{busy?<LoaderCircle className="animate-spin"/>:<Check/>}{busy?'Guardando…':completed?'Salvar alterações':'Confirmar revisão'}</Button></>}
  {doc.confirmed_expense_id&&<div className="border-t border-border pt-4 space-y-3"><p className="text-sm text-success">Despesa registrada{expense?` · ${expense.payment_status}`:''}. As alterações acima também atualizam a despesa.</p>{error&&<p role="alert" className="inline-error">{error}</p>}<Button disabled={busy} onClick={save}>{busy?<LoaderCircle className="animate-spin"/>:<Check/>}{busy?'Salvando…':'Salvar alterações'}</Button></div>}
  </></DialogContent></Dialog>;
}