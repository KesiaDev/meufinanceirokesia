CREATE TABLE public.fixed_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 100),
  amount numeric CHECK (amount IS NULL OR (amount >= 0 AND amount <= 999999999999.99)),
  variable boolean NOT NULL DEFAULT false,
  due_day integer CHECK (due_day IS NULL OR due_day BETWEEN 1 AND 31),
  category text,
  beneficiary_type text NOT NULL DEFAULT 'Casa',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fixed_expenses TO authenticated;
GRANT ALL ON public.fixed_expenses TO service_role;
ALTER TABLE public.fixed_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixed_expenses_owner ON public.fixed_expenses FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
ALTER TABLE public.expenses ADD COLUMN fixed_expense_id uuid REFERENCES public.fixed_expenses(id) ON DELETE SET NULL;
ALTER TABLE public.expenses ADD COLUMN reference_month text;
CREATE UNIQUE INDEX expenses_fixed_month_unique ON public.expenses (fixed_expense_id, reference_month) WHERE fixed_expense_id IS NOT NULL;