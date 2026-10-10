import { z } from 'zod';

export const extractionSchema = z.object({
  document_type: z.string(), kind: z.enum(['expense','statement','payment','other']),
  issuer: z.string().nullable(), document_date: z.string().nullable(), due_date: z.string().nullable(),
  total_amount: z.number().nullable(), currency: z.string().nullable(), description: z.string().nullable(),
  document_number: z.string().nullable(), payment_method: z.string().nullable(), payment_date: z.string().nullable(),
  beneficiary: z.string().nullable(), suggested_category: z.string().nullable(),
  taxes: z.number().nullable(), discounts: z.number().nullable(),
  items: z.array(z.object({description:z.string(),quantity:z.number().nullable(),unit_amount:z.number().nullable(),total_amount:z.number().nullable()})),
  extracted_text: z.string(), confidence: z.number(), uncertain_fields: z.array(z.string()), warnings: z.array(z.string()),
});
export type Extraction = z.infer<typeof extractionSchema>;
const date = z.string().refine(v => !v || isDocumentDate(v), 'Data inválida.');
export function isDocumentDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === value;
}
export const reviewSchema = z.object({
  source:z.enum(['manual','ai']).optional(),
  document_type:z.string().trim().min(1).max(150),kind:z.enum(['expense','statement','payment','other']),
  issuer:z.string().max(500),document_date:date,due_date:date,
  total_amount:z.number().min(0).max(999999999999.99).nullable(),currency:z.string().max(10),
   description:z.string().trim().max(1000),notes:z.string().max(10000),category:z.string().trim().max(100).optional(),
});
export type DocumentReview = z.infer<typeof reviewSchema>;
export function normalizeExtraction(input: Extraction): Extraction {
  return {...input, document_date:input.document_date && isDocumentDate(input.document_date)?input.document_date:null,
    due_date:input.due_date && isDocumentDate(input.due_date)?input.due_date:null,
    payment_date:input.payment_date && isDocumentDate(input.payment_date)?input.payment_date:null,
    total_amount:input.total_amount!==null && input.total_amount>=0 && input.total_amount<=999999999999.99?input.total_amount:null,
    confidence:Math.min(1,Math.max(0,input.confidence))};
}
export function canCreateExpense(review: DocumentReview, originalKind?: string) {
  return review.kind==='expense' && !['statement','payment'].includes(originalKind??'') && review.currency==='BRL' &&
    review.total_amount!==null && review.total_amount>=0 && isDocumentDate(review.document_date) && Boolean(review.description.trim());
}