ALTER TABLE public.fixed_expenses ADD COLUMN frequency text NOT NULL DEFAULT 'Mensal' CHECK (frequency IN ('Mensal','Semanal'));
ALTER TABLE public.fixed_expenses ADD COLUMN weekday smallint CHECK (weekday IS NULL OR weekday BETWEEN 0 AND 6);
DROP INDEX IF EXISTS public.expenses_fixed_month_unique;
CREATE UNIQUE INDEX expenses_fixed_month_date_unique ON public.expenses (fixed_expense_id, reference_month, expense_date) WHERE fixed_expense_id IS NOT NULL;