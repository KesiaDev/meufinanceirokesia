CREATE TABLE public.incomes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 name text NOT NULL,
 amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0 AND amount <= 999999999999.99),
 due_day integer CHECK (due_day BETWEEN 1 AND 31),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incomes TO authenticated;
GRANT ALL ON public.incomes TO service_role;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY incomes_owner ON public.incomes FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());