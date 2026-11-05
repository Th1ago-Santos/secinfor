CREATE OR REPLACE FUNCTION public.complete_preventive_maintenance(p_id uuid,p_result text DEFAULT NULL,p_next_date date DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m public.preventive_maintenances; child_id uuid; child_date date; was_generated boolean;
BEGIN
 IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'operador')) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 SELECT * INTO m FROM public.preventive_maintenances WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Manutenção não encontrada'; END IF;
 was_generated := m.next_generated;
 SELECT id,scheduled_date INTO child_id,child_date FROM public.preventive_maintenances WHERE generated_from_id=p_id;
 IF m.status='cancelada' THEN RAISE EXCEPTION 'Reabra a manutenção antes de concluir'; END IF;
 IF m.status='concluida' THEN
  PERFORM public.log_audit_event('Próxima ocorrência já gerada — repetição evitada','manutencao_preventiva',m.id,m.title,'equipamento','baixo',NULL,NULL,jsonb_build_object('equipamento',m.equipment_label,'secao',m.section_name,'nova_manutencao',child_id));
 ELSE
  UPDATE public.preventive_maintenances SET status='concluida',completed_at=now(),completed_by=auth.uid(),result=NULLIF(btrim(p_result),''),next_due_date=CASE WHEN was_generated THEN COALESCE(child_date,m.next_due_date) ELSE p_next_date END WHERE id=p_id;
 END IF;
 SELECT id INTO child_id FROM public.preventive_maintenances WHERE generated_from_id=p_id;
 RETURN jsonb_build_object('next_id',child_id,'reused',was_generated OR m.status='concluida','removed',was_generated AND child_id IS NULL);
END; $$;
REVOKE ALL ON FUNCTION public.complete_preventive_maintenance(uuid,text,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.complete_preventive_maintenance(uuid,text,date) TO authenticated,service_role;