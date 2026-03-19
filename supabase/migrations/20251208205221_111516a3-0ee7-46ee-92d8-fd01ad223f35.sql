-- Função para sincronizar perguntas de templates para tours
CREATE OR REPLACE FUNCTION public.sync_template_to_tour_questions(p_template_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_template RECORD;
BEGIN
  -- Buscar o template
  SELECT * INTO v_template FROM form_question_templates WHERE id = p_template_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Atualizar todas as perguntas dos passeios que usam este template
  UPDATE tour_custom_questions
  SET 
    question_text = v_template.title,
    question_type = v_template.field_type,
    is_required = v_template.is_required,
    is_active = v_template.is_active,
    options = CASE 
      WHEN v_template.options IS NOT NULL AND jsonb_array_length(v_template.options) > 0 
      THEN ARRAY(SELECT elem::text FROM jsonb_array_elements_text(
        CASE 
          WHEN jsonb_typeof(v_template.options) = 'array' 
          THEN (SELECT jsonb_agg(COALESCE(elem->>'label', elem->>'value', elem::text)) FROM jsonb_array_elements(v_template.options) AS elem)
          ELSE '[]'::jsonb
        END
      ) AS elem)
      ELSE options
    END,
    updated_at = now()
  WHERE template_id = p_template_id
    OR (standard_field_key = v_template.standard_field_key AND v_template.standard_field_key IS NOT NULL);
END;
$function$;

-- Trigger para sincronizar automaticamente quando template é atualizado
CREATE OR REPLACE FUNCTION public.trigger_sync_template_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Sincronizar para todos os tours que usam este template
  PERFORM sync_template_to_tour_questions(NEW.id);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS sync_template_on_update ON form_question_templates;
CREATE TRIGGER sync_template_on_update
  AFTER UPDATE ON form_question_templates
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_template_changes();

-- Vincular perguntas existentes aos templates por standard_field_key
UPDATE tour_custom_questions tcq
SET template_id = fqt.id
FROM form_question_templates fqt
WHERE tcq.standard_field_key = fqt.standard_field_key
  AND fqt.standard_field_key IS NOT NULL
  AND tcq.template_id IS NULL;

-- Sincronizar textos e configurações agora
UPDATE tour_custom_questions tcq
SET 
  question_text = fqt.title,
  question_type = fqt.field_type,
  is_required = fqt.is_required,
  is_active = fqt.is_active
FROM form_question_templates fqt
WHERE tcq.standard_field_key = fqt.standard_field_key
  AND fqt.standard_field_key IS NOT NULL;