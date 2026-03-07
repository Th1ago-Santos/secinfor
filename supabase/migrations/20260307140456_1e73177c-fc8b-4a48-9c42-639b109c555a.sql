
-- Create alerts table
CREATE TABLE public.alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo text NOT NULL,
  nivel text NOT NULL DEFAULT 'atencao',
  mensagem text NOT NULL,
  item_id uuid,
  item_tipo text,
  item_patrimonio text,
  secao text,
  status text NOT NULL DEFAULT 'ativo',
  resolvido_em timestamp with time zone,
  resolvido_por uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view alerts" ON public.alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert alerts" ON public.alerts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update alerts" ON public.alerts FOR UPDATE TO authenticated USING (true);
