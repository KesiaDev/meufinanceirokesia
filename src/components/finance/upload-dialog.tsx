import { useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { analyzeDocument } from '@/lib/document-review.functions';
import { CategoryManager } from './category-manager';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, Upload, FileUp, ShieldCheck, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { validateDocument } from '@/lib/finance';

export function UploadDialog({ open, onOpenChange, categories, onUploaded }: { open:boolean; onOpenChange:(open:boolean)=>void; categories:{id:string;name:string}[]; onUploaded:(id:string)=>void }) {
 const analyze=useServerFn(analyzeDocument);const [readWithAI,setReadWithAI]=useState(true);const [category,setCategory]=useState('');
 const input = useRef<HTMLInputElement>(null);const camera = useRef<HTMLInputElement>(null);
 const [busy,setBusy]=useState(false);const [progress,setProgress]=useState('');const [error,setError]=useState('');const queryClient=useQueryClient();
 async function upload(files:FileList|null) {
  if(busy||!files?.length) return;setError('');const selected=Array.from(files);
  for(const file of selected) {const invalid=validateDocument(file);if(invalid){setError(`${file.name}: ${invalid}`);return;}}
  setBusy(true);
  try {const {data,error:authError}=await supabase.auth.getUser();if(authError||!data.user) throw new Error('Entre na sua conta novamente para enviar documentos.');
   let complete=0;const uploaded:string[]=[];
   for(const file of selected) {
    setProgress(`Guardando ${++complete} de ${selected.length}: ${file.name}`);
    const extension = file.type==='application/pdf'?'pdf':file.type==='image/jpeg'?'jpg':file.type==='image/png'?'png':'webp';
    const path=`${data.user.id}/${crypto.randomUUID()}.${extension}`;
    const {error:uploadError}=await supabase.storage.from('financial-documents').upload(path,file,{contentType:file.type,upsert:false});if(uploadError)throw uploadError;
    const {data:saved,error:saveError}=await supabase.from('documents').insert({user_id:data.user.id,file_path:path,original_filename:file.name,mime_type:file.type,file_size:file.size,processing_status:'archived',preferred_category:category||null}).select('id').single();
    if(saved)uploaded.push(saved.id);
    if(saveError){await supabase.storage.from('financial-documents').remove([path]);throw saveError;}
   }
   let readingError='';
   if(readWithAI){for(const [index,id] of uploaded.entries()){setProgress(`Lendo ${index+1} de ${uploaded.length} com IA…`);try{const result=await analyze({data:{id,category}});if(!result.ok){readingError=result.error;break;}}catch(err){readingError=err instanceof Error?err.message:'Não foi possível concluir a leitura. O original está guardado.';break;}}}
   await queryClient.invalidateQueries({queryKey:['workspace']});
   if(readingError)toast.error(readingError);else toast.success(readWithAI?'Leitura concluída. Confira os dados antes de registrar a despesa.':selected.length===1?'Documento guardado com segurança.':'Documentos guardados com segurança.');
   onOpenChange(false);if(uploaded[0])onUploaded(uploaded[0]);
  }catch(err){setError(err instanceof Error?err.message:'Não foi possível guardar o documento. Tente novamente.');await queryClient.invalidateQueries({queryKey:['workspace']});}finally{setBusy(false);setProgress('');if(input.current)input.current.value='';if(camera.current)camera.current.value='';}
 }
 return <Dialog open={open} onOpenChange={value=>{if(!busy){setError('');onOpenChange(value);}}}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Adicionar documento</DialogTitle><DialogDescription>Guarde notas, recibos e documentos no seu arquivo privado.</DialogDescription></DialogHeader><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={readWithAI} disabled={busy} onChange={e=>setReadWithAI(e.target.checked)}/>Ler com IA ao enviar</label>{readWithAI&&<><div className="field mt-0"><label htmlFor="upload-category">Categoria antes da leitura</label><select id="upload-category" className="filter-select" value={category} disabled={busy} onChange={e=>setCategory(e.target.value)}><option value="">Sugerir entre minhas categorias</option>{categories.map(c=><option key={c.id}>{c.name}</option>)}</select></div>{!busy&&<CategoryManager categories={categories} compact/>}<p className="text-xs text-muted-foreground">Lovable AI · uso descontado dos créditos do workspace.</p></>}<input ref={input} type="file" className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={e=>upload(e.target.files)}/><input ref={camera} type="file" className="hidden" accept="image/*" capture="environment" onChange={e=>upload(e.target.files)}/><div className="upload-zone" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(!busy)upload(e.dataTransfer.files);}}>{busy?<LoaderCircle size={32} className="animate-spin"/>:<FileUp size={36}/>}<h3 className="font-semibold">{busy?(progress.startsWith('Lendo')?'Lendo seu documento…':'Guardando seu documento…'):'Seus documentos, em um só lugar'}</h3><p className="subtitle">{busy?progress:'JPG, PNG, WEBP ou PDF • até 20 MB por arquivo'}</p><Button className="mt-5" disabled={busy} onClick={()=>input.current?.click()}><Upload size={16}/>Selecionar arquivos</Button></div><Button variant="outline" className="w-full" disabled={busy} onClick={()=>camera.current?.click()}><Camera/>Fotografar documento</Button><p className="text-xs text-muted-foreground leading-relaxed mt-2">O original será preservado. Nenhuma despesa ou pagamento será registrado sem sua confirmação.</p>{error&&<div className="inline-error" role="alert">{error}</div>}<div className="footer-note"><ShieldCheck size={13}/> Apenas você pode acessar estes arquivos</div></DialogContent></Dialog>;
}