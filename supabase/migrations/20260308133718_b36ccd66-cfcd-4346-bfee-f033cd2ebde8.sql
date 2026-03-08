
CREATE TABLE public.computer_priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secao text NOT NULL,
  responsavel text NOT NULL,
  motivo text NOT NULL,
  observacoes text,
  data_solicitacao date DEFAULT CURRENT_DATE,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.computer_priorities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view priorities" ON public.computer_priorities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert priorities" ON public.computer_priorities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update priorities" ON public.computer_priorities FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete priorities" ON public.computer_priorities FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_computer_priorities_updated_at
  BEFORE UPDATE ON public.computer_priorities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
