import { rebecaShare } from './beneficiary';
export const MAX_FILE_SIZE = 20 * 1024 * 1024;
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export function validateDocument(file: { size: number; type: string }) {
  if (!ACCEPTED_TYPES.includes(file.type)) return 'Selecione um arquivo JPG, PNG, WEBP ou PDF.';
  if (file.size === 0) return 'O arquivo está vazio.';
  if (file.size > MAX_FILE_SIZE) return 'Cada arquivo deve ter no máximo 20 MB.';
  return null;
}
export const currency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
export const dateLabel = (value: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(value.length === 10 ? `${value}T12:00:00-03:00` : value));
export function financialTotals(expenses: { total_amount: number; paid_amount: number; payment_status: string; beneficiary_type: string; allocated_amount: number | null }[]) {
  const active = expenses.filter(e => e.payment_status !== 'Cancelado');
  return {
    total: active.reduce((sum, e) => sum + Math.round(Number(e.total_amount) * 100), 0) / 100,
    paid: active.filter(e => ['Pago', 'Parcialmente pago'].includes(e.payment_status)).reduce((sum, e) => sum + Math.round(Number(e.paid_amount) * 100), 0) / 100,
    rebeca: active.reduce((sum, e) => sum + Math.round(rebecaShare(e) * 100), 0) / 100,
    pending: active.filter(e => !['Pago', 'Cancelado'].includes(e.payment_status)).length,
  };
}
export function pageHead(title: string, description: string) {
  return { meta: [{ title: `${title} | Meu Financeiro IA` }, { name: 'description', content: description }, { property: 'og:title', content: `${title} | Meu Financeiro IA` }, { property: 'og:description', content: description }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] };
}

/** Today in São Paulo as YYYY-MM-DD, so an expense counts in the month the user is living in. */
export const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
