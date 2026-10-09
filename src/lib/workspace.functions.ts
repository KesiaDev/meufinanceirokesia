import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const getWorkspace = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { supabase, userId } = context;
  const [profile, documents, expenses] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('documents').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('expenses').select('*').eq('user_id', userId).order('expense_date', { ascending: false }),
  ]);
  if (profile.error || documents.error || expenses.error) throw new Error('Não foi possível carregar seus registros. Tente novamente.');
  return { profile: profile.data, documents: documents.data, expenses: expenses.data, userId };
});