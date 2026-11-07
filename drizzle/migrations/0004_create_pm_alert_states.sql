CREATE TABLE public.pm_alert_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  maintenance_id UUID NOT NULL REFERENCES public.preventive_maintenances(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('atrasada','vence_hoje','proximos_7_dias','recorrencia_gerada')),
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, maintenance_id, alert_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_alert_states TO authenticated;
GRANT ALL ON public.pm_alert_states TO service_role;

ALTER TABLE public.pm_alert_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own pm alert states"
ON public.pm_alert_states FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users insert own pm alert states"
ON public.pm_alert_states FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own pm alert states"
ON public.pm_alert_states FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own pm alert states"
ON public.pm_alert_states FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.pm_clear_alert_states()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('concluida','cancelada') AND OLD.status IS DISTINCT FROM NEW.status THEN
    DELETE FROM public.pm_alert_states
    WHERE maintenance_id = NEW.id
      AND alert_type IN ('atrasada','vence_hoje','proximos_7_dias');
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.pm_clear_alert_states() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER pm_clear_alert_states_trigger
AFTER UPDATE OF status ON public.preventive_maintenances
FOR EACH ROW EXECUTE FUNCTION public.pm_clear_alert_states();