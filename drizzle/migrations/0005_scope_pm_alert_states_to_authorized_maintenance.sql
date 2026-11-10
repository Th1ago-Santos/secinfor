GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_alert_states TO authenticated;
GRANT ALL ON public.pm_alert_states TO service_role;
REVOKE ALL ON public.pm_alert_states FROM anon;
CREATE POLICY "Authorized maintenance required for alert states" ON public.pm_alert_states AS RESTRICTIVE FOR ALL TO authenticated USING (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.preventive_maintenances m WHERE m.id = maintenance_id)) WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.preventive_maintenances m WHERE m.id = maintenance_id));