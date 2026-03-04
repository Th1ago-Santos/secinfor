
-- Create sections table
CREATE TABLE public.sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sections" ON public.sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sections" ON public.sections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update sections" ON public.sections FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete sections" ON public.sections FOR DELETE TO authenticated USING (true);

-- Insert default sections
INSERT INTO public.sections (name) VALUES
  ('Almoxarifado'), ('Aprv'), ('Ass Jur'), ('Capotaria'),
  ('Cia C Ap - Res Mat'), ('Cia C Ap - Sgte'), ('Cia Mnt - Res Mat'),
  ('Cia Mnt - Secao de Armt'), ('Cia Mnt - Sgte'), ('Cia Sau'),
  ('Cia Sup - Res Mat'), ('Cia Sup - Sgte'), ('Cia Trnp - Res Mat'),
  ('Cia Trnp - Sgte'), ('COL'), ('Com Soc'), ('Ferramental'),
  ('Fisc Adm'), ('Forte Nazare'), ('GRCP'), ('H Cmp'),
  ('Informatica'), ('Ordenanca'), ('Pel Ap'), ('Pel Com'),
  ('Pelotão de Obras'), ('S1'), ('S2'), ('S3'), ('S4'),
  ('SALC'), ('Secretaria'), ('SFPC'), ('SPP'), ('St Fin');

-- Add foto_url column to notebooks
ALTER TABLE public.notebooks ADD COLUMN foto_url text;

-- Create storage bucket for notebook photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('notebook-photos', 'notebook-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'notebook-photos');
CREATE POLICY "Authenticated users can update photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'notebook-photos');
CREATE POLICY "Authenticated users can delete photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'notebook-photos');
CREATE POLICY "Anyone can view photos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'notebook-photos');
