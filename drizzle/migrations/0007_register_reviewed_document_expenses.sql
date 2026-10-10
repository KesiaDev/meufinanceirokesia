CREATE OR REPLACE FUNCTION public.confirm_document_review(p_document_id uuid, p_review jsonb, p_create_expense boolean DEFAULT false)
 RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public'
AS $function$
DECLARE d public.documents; expense_id uuid; amount numeric; kind text; doc_date date; due date; category_name text; effective_review jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Entre na sua conta novamente.'; END IF;
 SELECT * INTO d FROM public.documents WHERE id=p_document_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Documento não encontrado.'; END IF;
 IF d.processing_status='processing' THEN RAISE EXCEPTION 'Aguarde a leitura do documento.'; END IF;
 IF d.confirmed_expense_id IS NOT NULL THEN RETURN d.confirmed_expense_id; END IF;
 IF d.reviewed_at IS NOT NULL AND NOT p_create_expense THEN RETURN NULL; END IF;
 effective_review:=CASE WHEN d.reviewed_at IS NOT NULL THEN d.reviewed_data ELSE p_review END;
 IF d.ai_extraction IS NULL AND effective_review->>'source' IS DISTINCT FROM 'manual' THEN RAISE EXCEPTION 'Leia o documento ou escolha o preenchimento manual.'; END IF;
 kind:=effective_review->>'kind'; amount:=NULLIF(effective_review->>'total_amount','')::numeric; doc_date:=NULLIF(effective_review->>'document_date','')::date; due:=NULLIF(effective_review->>'due_date','')::date;
 category_name:=nullif(trim(effective_review->>'category'),'');
 IF category_name IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.expense_categories WHERE user_id=auth.uid() AND name=category_name) THEN RAISE EXCEPTION 'Selecione uma categoria da sua conta.'; END IF;
 IF amount<0 OR amount>999999999999.99 THEN RAISE EXCEPTION 'Valor inválido.'; END IF;
 IF p_create_expense THEN
  IF kind IS DISTINCT FROM 'expense' OR d.ai_extraction->>'kind' IN ('statement','payment') THEN RAISE EXCEPTION 'Faturas e comprovantes não geram novas despesas nesta etapa.'; END IF;
  IF effective_review->>'currency' IS DISTINCT FROM 'BRL' THEN RAISE EXCEPTION 'Confirme o valor em reais.'; END IF;
  IF amount IS NULL OR doc_date IS NULL OR length(trim(coalesce(effective_review->>'description','')))=0 THEN RAISE EXCEPTION 'Preencha descrição, data e valor.'; END IF;
  INSERT INTO public.expenses(user_id,document_id,description,category,expense_date,due_date,total_amount,paid_amount,payment_status,beneficiary_type) VALUES(auth.uid(),d.id,effective_review->>'description',category_name,doc_date,due,amount,0,'Pendente','Pendente de classificação') RETURNING id INTO expense_id;
 END IF;
 UPDATE public.documents SET document_type=coalesce(nullif(effective_review->>'document_type',''),'Não identificado'),issuer=nullif(effective_review->>'issuer',''),document_date=doc_date,due_date=due,total_amount=amount,notes=coalesce(effective_review->>'notes',''),processing_status='completed',processing_error=NULL,confirmed_expense_id=expense_id,reviewed_at=coalesce(d.reviewed_at,now()),reviewed_data=effective_review WHERE id=d.id AND user_id=auth.uid();
 RETURN expense_id;
END; $function$;
REVOKE ALL ON FUNCTION public.confirm_document_review(uuid,jsonb,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_document_review(uuid,jsonb,boolean) TO authenticated;