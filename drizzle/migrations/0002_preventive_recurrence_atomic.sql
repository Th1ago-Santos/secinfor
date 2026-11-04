ALTER TABLE public.preventive_maintenances
 ADD COLUMN recurrence_enabled boolean NOT NULL DEFAULT false,
 ADD COLUMN recurrence_interval integer,
 ADD COLUMN recurrence_unit text,
 ADD COLUMN series_id uuid,
 ADD COLUMN generated_from_id uuid,
 ADD COLUMN next_generated boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX pm_one_child_per_origin ON public.preventive_maintenances(generated_from_id) WHERE generated_from_id IS NOT NULL;
CREATE INDEX pm_series_idx ON public.preventive_maintenances(series_id);
ALTER TABLE public.preventive_maintenances ADD CONSTRAINT pm_recurrence_valid CHECK (NOT recurrence_enabled OR (recurrence_interval IS NOT NULL AND recurrence_interval > 0 AND recurrence_unit IS NOT NULL AND recurrence_unit IN ('dias','semanas','meses','anos')));
CREATE FUNCTION public.pm_next_date(p_date date, p_quantity integer, p_unit text) RETURNS date LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
BEGIN
 IF p_quantity IS NULL OR p_quantity <= 0 THEN RAISE EXCEPTION 'Intervalo deve ser inteiro maior que zero'; END IF;
 CASE p_unit
 WHEN 'dias' THEN RETURN p_date + p_quantity;
 WHEN 'semanas' THEN RETURN p_date + p_quantity * 7;
 WHEN 'meses' THEN RETURN (p_date + make_interval(months => p_quantity))::date;
 WHEN 'anos' THEN RETURN (p_date + make_interval(years => p_quantity))::date;
 ELSE RAISE EXCEPTION 'Unidade inválida'; END CASE;
END; $$;
CREATE FUNCTION public.pm_recurrence_before() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF pg_trigger_depth() = 1 THEN
  IF TG_OP='INSERT' AND (NEW.generated_from_id IS NOT NULL OR NEW.next_generated) THEN RAISE EXCEPTION 'Vínculos são gerenciados automaticamente'; END IF;
  IF TG_OP='UPDATE' AND (NEW.generated_from_id IS DISTINCT FROM OLD.generated_from_id OR NEW.next_generated IS DISTINCT FROM OLD.next_generated OR NEW.series_id IS DISTINCT FROM OLD.series_id) THEN RAISE EXCEPTION 'Vínculos são gerenciados automaticamente'; END IF;
 END IF;
 IF NEW.recurrence_enabled THEN
  IF NEW.recurrence_interval IS NULL OR NEW.recurrence_interval <= 0 OR NEW.recurrence_unit IS NULL OR NEW.recurrence_unit NOT IN ('dias','semanas','meses','anos') THEN RAISE EXCEPTION 'Periodicidade inválida'; END IF;
  NEW.series_id := COALESCE(NEW.series_id, NEW.id);
 ELSE NEW.recurrence_interval := NULL; NEW.recurrence_unit := NULL;
 END IF;
 IF NEW.status='concluida' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'concluida') THEN
  NEW.completed_at := COALESCE(NEW.completed_at, now()); NEW.completed_by := auth.uid();
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER pm_recurrence_before BEFORE INSERT OR UPDATE ON public.preventive_maintenances FOR EACH ROW EXECUTE FUNCTION public.pm_recurrence_before();
CREATE FUNCTION public.pm_recurrence_after() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE child_id uuid; next_date date; details jsonb;
BEGIN
 IF pg_trigger_depth() > 1 THEN RETURN NULL; END IF;
 IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operador')) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 IF TG_OP='DELETE' THEN
  PERFORM public.log_audit_event('Exclusão de manutenção preventiva','manutencao_preventiva',OLD.id,OLD.title,'equipamento','alto',NULL,NULL,jsonb_build_object('origem',OLD.generated_from_id,'serie',OLD.series_id,'equipamento',OLD.equipment_label,'secao',OLD.section_name));
  RETURN NULL;
 END IF;
 details := jsonb_build_object('equipamento',NEW.equipment_label,'secao',NEW.section_name,'serie',NEW.series_id,'intervalo',NEW.recurrence_interval,'unidade',NEW.recurrence_unit);
 IF (TG_OP='INSERT' AND NEW.recurrence_enabled) OR (TG_OP='UPDATE' AND NEW.recurrence_enabled IS DISTINCT FROM OLD.recurrence_enabled) THEN
  PERFORM public.log_audit_event(CASE WHEN NEW.recurrence_enabled THEN 'Ativação da recorrência' ELSE 'Desativação da recorrência' END,'manutencao_preventiva',NEW.id,NEW.title,'equipamento','medio',NULL,NULL,details);
 ELSIF TG_OP='UPDATE' AND (NEW.recurrence_interval IS DISTINCT FROM OLD.recurrence_interval OR NEW.recurrence_unit IS DISTINCT FROM OLD.recurrence_unit) THEN
  PERFORM public.log_audit_event('Alteração de periodicidade','manutencao_preventiva',NEW.id,NEW.title,'equipamento','medio',NULL,NULL,details || jsonb_build_object('intervalo_anterior',OLD.recurrence_interval,'unidade_anterior',OLD.recurrence_unit));
 END IF;
 IF NEW.status='cancelada' AND NEW.generated_from_id IS NOT NULL AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
  PERFORM public.log_audit_event('Cancelamento de ocorrência futura','manutencao_preventiva',NEW.id,NEW.title,'equipamento','alto',NULL,NULL,details || jsonb_build_object('origem',NEW.generated_from_id));
 END IF;
 IF NEW.status='concluida' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'concluida') THEN
  PERFORM public.log_audit_event('Conclusão de manutenção preventiva','manutencao_preventiva',NEW.id,NEW.title,'equipamento','medio',NULL,NULL,details);
  IF NEW.recurrence_enabled THEN
   SELECT id INTO child_id FROM public.preventive_maintenances WHERE generated_from_id=NEW.id;
   IF NOT NEW.next_generated AND child_id IS NULL THEN
    next_date := COALESCE(NEW.next_due_date,public.pm_next_date((NEW.completed_at AT TIME ZONE 'America/Sao_Paulo')::date,NEW.recurrence_interval,NEW.recurrence_unit));
    IF next_date < (NEW.completed_at AT TIME ZONE 'America/Sao_Paulo')::date THEN RAISE EXCEPTION 'Próxima data não pode ser anterior à conclusão'; END IF;
    INSERT INTO public.preventive_maintenances(equipment_type,notebook_id,material_id,equipment_label,section_id,section_name,title,description,maintenance_type,status,priority,scheduled_date,assigned_to,assigned_name,created_by,recurrence_enabled,recurrence_interval,recurrence_unit,series_id,generated_from_id)
    VALUES(NEW.equipment_type,NEW.notebook_id,NEW.material_id,NEW.equipment_label,NEW.section_id,NEW.section_name,NEW.title,NEW.description,NEW.maintenance_type,'planejada',NEW.priority,next_date,NEW.assigned_to,NEW.assigned_name,auth.uid(),true,NEW.recurrence_interval,NEW.recurrence_unit,NEW.series_id,NEW.id) RETURNING id INTO child_id;
    UPDATE public.preventive_maintenances SET next_generated=true,next_due_date=next_date WHERE id=NEW.id;
    PERFORM public.log_audit_event('Geração automática da próxima manutenção','manutencao_preventiva',child_id,NEW.title,'equipamento','medio',NULL,NULL,details || jsonb_build_object('origem',NEW.id,'nova_manutencao',child_id,'data_agendada',next_date,'usuario',auth.uid()));
   ELSE
    PERFORM public.log_audit_event('Próxima ocorrência já gerada — repetição evitada','manutencao_preventiva',NEW.id,NEW.title,'equipamento','baixo',NULL,NULL,details || jsonb_build_object('nova_manutencao',child_id));
   END IF;
  END IF;
 END IF;
 RETURN NULL;
END; $$;
CREATE TRIGGER pm_recurrence_after AFTER INSERT OR UPDATE OR DELETE ON public.preventive_maintenances FOR EACH ROW EXECUTE FUNCTION public.pm_recurrence_after();
CREATE FUNCTION public.complete_preventive_maintenance(p_id uuid,p_result text DEFAULT NULL,p_next_date date DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m public.preventive_maintenances; child_id uuid; was_generated boolean;
BEGIN
 IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operador')) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 SELECT * INTO m FROM public.preventive_maintenances WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Manutenção não encontrada'; END IF;
 was_generated := m.next_generated;
 IF m.status='cancelada' THEN RAISE EXCEPTION 'Reabra a manutenção antes de concluir'; END IF;
 IF m.status='concluida' THEN
  PERFORM public.log_audit_event('Próxima ocorrência já gerada — repetição evitada','manutencao_preventiva',m.id,m.title,'equipamento','baixo',NULL,NULL,jsonb_build_object('equipamento',m.equipment_label,'secao',m.section_name));
 ELSE
  UPDATE public.preventive_maintenances SET status='concluida',completed_at=now(),completed_by=auth.uid(),result=NULLIF(btrim(p_result),''),next_due_date=p_next_date WHERE id=p_id;
 END IF;
 SELECT id INTO child_id FROM public.preventive_maintenances WHERE generated_from_id=p_id;
 RETURN jsonb_build_object('next_id',child_id,'reused',was_generated OR m.status='concluida','removed',was_generated AND child_id IS NULL);
END; $$;
REVOKE ALL ON FUNCTION public.pm_recurrence_before(),public.pm_recurrence_after(),public.pm_next_date(date,integer,text),public.complete_preventive_maintenance(uuid,text,date) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.pm_recurrence_before(),public.pm_recurrence_after() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.complete_preventive_maintenance(uuid,text,date),public.pm_next_date(date,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pm_recurrence_before(),public.pm_recurrence_after(),public.pm_next_date(date,integer,text),public.complete_preventive_maintenance(uuid,text,date) TO service_role;