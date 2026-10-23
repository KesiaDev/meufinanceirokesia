import { describe,it,expect } from 'vitest';
import { canCreateExpense, shouldRegisterExpense, normalizeExtraction, reviewSchema, type Extraction } from '@/lib/document-review';
const review={document_type:'Boleto',kind:'expense' as const,issuer:'',document_date:'2026-10-09',due_date:'',total_amount:250,currency:'BRL',description:'Condomínio',notes:''};
describe('Revisão financeira',()=>{
 it('permite incluir nota revisada que ainda não tem despesa',()=>{expect(shouldRegisterExpense(review,'expense',null)).toBe(true);});
 it('não oferece uma segunda despesa para a mesma nota',()=>{expect(shouldRegisterExpense(review,'expense','linked-expense')).toBe(false);});
 it('não inclui fatura revisada no total de compras',()=>{expect(shouldRegisterExpense(review,'statement',null)).toBe(false);});
  it('permite registrar os dados manuais sem extração por IA',()=>{const manual=reviewSchema.parse({...review,source:'manual',description:'McLanche Feliz',document_date:'2026-10-09',total_amount:29.9});expect(manual.source).toBe('manual');expect(canCreateExpense(manual)).toBe(true);});
 it('exige data e valor reais em vez de inventar campos ausentes',()=>{expect(canCreateExpense({...review,total_amount:null})).toBe(false);expect(canCreateExpense({...review,document_date:''})).toBe(false);expect(canCreateExpense(review)).toBe(true);});
 it('não duplica fatura como compra mesmo quando o tipo é alterado na revisão',()=>{expect(canCreateExpense(review,'statement')).toBe(false);});
 it('não registra comprovante de pagamento como nova despesa',()=>{expect(canCreateExpense(review,'payment')).toBe(false);});
 it('não converte moeda estrangeira silenciosamente para reais',()=>{expect(canCreateExpense({...review,currency:'USD'})).toBe(false);});
 it('rejeita datas impossíveis',()=>{expect(reviewSchema.safeParse({...review,document_date:'2026-02-30'}).success).toBe(false);});
 it('preserva campos desconhecidos sem substituir pela data atual ou zero',()=>{const result=normalizeExtraction({document_date:null,due_date:null,payment_date:null,total_amount:null,confidence:.7} as Extraction);expect(result.document_date).toBeNull();expect(result.total_amount).toBeNull();});
});