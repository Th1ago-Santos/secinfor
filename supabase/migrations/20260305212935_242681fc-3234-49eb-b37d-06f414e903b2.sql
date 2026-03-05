
-- Add maintenance columns to notebooks
ALTER TABLE public.notebooks
  ADD COLUMN status text NOT NULL DEFAULT 'Em uso',
  ADD COLUMN data_entrada_manutencao timestamptz,
  ADD COLUMN data_saida_manutencao timestamptz,
  ADD COLUMN motivo_manutencao text,
  ADD COLUMN observacoes_manutencao text;

-- Create movements table
CREATE TABLE public.movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_tipo text NOT NULL,
  item_id uuid NOT NULL,
  data_hora timestamptz NOT NULL DEFAULT now(),
  tipo_evento text NOT NULL,
  secao_origem text,
  secao_destino text,
  responsavel_anterior text,
  responsavel_novo text,
  usuario_sistema uuid REFERENCES auth.users(id),
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view movements" ON public.movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert movements" ON public.movements FOR INSERT TO authenticated WITH CHECK (true);

-- Create inventory_sessions table
CREATE TABLE public.inventory_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_inicio timestamptz NOT NULL DEFAULT now(),
  data_fim timestamptz,
  usuario_id uuid REFERENCES auth.users(id) NOT NULL,
  secao_alvo text,
  status text NOT NULL DEFAULT 'em_andamento',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view inventory sessions" ON public.inventory_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert inventory sessions" ON public.inventory_sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update inventory sessions" ON public.inventory_sessions FOR UPDATE TO authenticated USING (true);

-- Create inventory_items table
CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.inventory_sessions(id) ON DELETE CASCADE NOT NULL,
  patrimonio text NOT NULL,
  item_tipo text,
  item_id uuid,
  conferido_em timestamptz NOT NULL DEFAULT now(),
  usuario_id uuid REFERENCES auth.users(id) NOT NULL,
  status text NOT NULL DEFAULT 'conferido',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view inventory items" ON public.inventory_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert inventory items" ON public.inventory_items FOR INSERT TO authenticated WITH CHECK (true);
