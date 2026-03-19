-- Add conditional fields to tour_custom_questions
ALTER TABLE tour_custom_questions 
ADD COLUMN IF NOT EXISTS condition_field_key TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS condition_value TEXT DEFAULT NULL;

-- Also add to form_question_templates for central management
ALTER TABLE form_question_templates
ADD COLUMN IF NOT EXISTS condition_field_key TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS condition_value TEXT DEFAULT NULL;

-- Update the sync function to include conditions
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
    condition_field_key = v_template.condition_field_key,
    condition_value = v_template.condition_value,
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

-- Set default conditions for existing questions
UPDATE tour_custom_questions 
SET condition_field_key = 'problema_saude', condition_value = 'true'
WHERE standard_field_key = 'descricao_problema_saude';

UPDATE tour_custom_questions 
SET condition_field_key = 'assistencia_diferenciada', condition_value = 'true'
WHERE standard_field_key = 'descricao_assistencia_diferenciada';

-- Update templates too
UPDATE form_question_templates 
SET condition_field_key = 'problema_saude', condition_value = 'true'
WHERE standard_field_key = 'descricao_problema_saude';

UPDATE form_question_templates 
SET condition_field_key = 'assistencia_diferenciada', condition_value = 'true'
WHERE standard_field_key = 'descricao_assistencia_diferenciada';