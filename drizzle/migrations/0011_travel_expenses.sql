CREATE TABLE public.travel_expenses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 trip text NOT NULL DEFAULT 'Portugal — Master and Scale',
 person text NOT NULL CHECK (person IN ('Késia','Gisele')),
 description text NOT NULL DEFAULT '',
 expense_date date NOT NULL DEFAULT current_date,
 amount numeric NOT NULL DEFAULT 0,
 currency text NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR','BRL')),
 notes text NOT NULL DEFAULT '',
 file_path text,
 mime_type text,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_expenses TO authenticated;
GRANT ALL ON public.travel_expenses TO service_role;
ALTER TABLE public.travel_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY travel_owner ON public.travel_expenses FOR ALL TO authenticated
 USING (user_id = auth.uid())
 WITH CHECK (user_id = auth.uid() AND (file_path IS NULL OR split_part(file_path,'/',1) = auth.uid()::text));