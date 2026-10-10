import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { reviewSchema, canCreateExpense } from './document-review';
import { validateDocument } from './finance';

export const analyzeDocument = createServerFn({method:'POST'}).middleware([requireSupabaseAuth])
  .inputValidator((input:unknown)=>z.object({id:z.string().uuid(),category:z.string().trim().max(100).optional()}).parse(input))
  .handler(async({data,context})=>{
    const {supabase,userId}=context;
    const {data:doc,error}=await supabase.from('documents').select('*').eq('id',data.id).eq('user_id',userId).single();
    if(error||!doc) return {ok:false as const,error:'Documento não encontrado.'};
    if(doc.reviewed_at) return {ok:false as const,error:'Este documento já foi revisado. O registro foi preservado.'};
    if(doc.ai_extraction) return {ok:true as const};
    if(doc.processing_status==='processing' && new Date(doc.updated_at).getTime()>Date.now()-10*60*1000)
      return {ok:false as const,error:'Este documento já está em leitura. Aguarde e atualize a lista.'};
    const key=process.env['LOVABLE_API_KEY'];
    if(!key)return {ok:false as const,error:'A leitura por IA precisa de configuração.'};
    const {data:categories,error:categoryError}=await supabase.from('expense_categories').select('name').eq('user_id',userId);
    if(categoryError)return {ok:false as const,error:'Não foi possível carregar suas categorias.'};
    const categoryNames=categories.map(c=>c.name);
    const category=data.category??doc.preferred_category??'';
    if(category&&!categoryNames.includes(category))return {ok:false as const,error:'Selecione uma categoria da sua conta.'};
    const {data:locked,error:lockError}=await supabase.from('documents').update({processing_status:'processing',processing_error:null,ai_error_status:null,preferred_category:category||null})
      .eq('id',doc.id).eq('user_id',userId).eq('updated_at',doc.updated_at).select('id').maybeSingle();
    if(lockError||!locked)return {ok:false as const,error:'O documento mudou. Atualize a lista antes de continuar.'};
    try {
      const {data:file,error:downloadError}=await supabase.storage.from('financial-documents').download(doc.file_path);
      if(downloadError||!file)throw new Error('Não foi possível ler o original guardado.');
      const invalid=validateDocument({size:file.size,type:doc.mime_type});if(invalid)throw new Error(invalid);
      const {extractDocument}=await import('./document-ai.server');
      const extraction=await extractDocument(file,doc.original_filename,doc.mime_type,key,getRequest().signal,categoryNames,category);
      const {error:saveError}=await supabase.from('documents').update({ai_extraction:extraction,extracted_text:extraction.extracted_text,extraction_confidence:extraction.confidence,processing_status:'review',processing_error:null,ai_error_status:null}).eq('id',doc.id).eq('user_id',userId);
      if(saveError)throw new Error('A leitura terminou, mas não foi possível guardar os dados.');
      return {ok:true as const};
    }catch(err){
      const message=err instanceof Error?err.message:'Não foi possível ler o documento.';
      const status=err && typeof err==='object' && 'status' in err && typeof err.status==='number'?err.status:500;
      await supabase.from('documents').update({processing_status:'error',processing_error:message,ai_error_status:status}).eq('id',doc.id).eq('user_id',userId);
      return {ok:false as const,error:message};
    }
  });

export const confirmDocument = createServerFn({method:'POST'}).middleware([requireSupabaseAuth])
  .inputValidator((input:unknown)=>z.object({id:z.string().uuid(),review:reviewSchema,createExpense:z.boolean()}).parse(input))
  .handler(async({data,context})=>{
    if(data.createExpense&&!canCreateExpense(data.review))return {ok:false as const,error:'Preencha descrição, data e valor em reais para registrar a despesa.'};
    const {error}=await context.supabase.rpc('confirm_document_review',{p_document_id:data.id,p_review:data.review,p_create_expense:data.createExpense});
    if(error)return {ok:false as const,error:'Não foi possível confirmar. Verifique os campos e atualize o documento.'};
    return {ok:true as const};
  });