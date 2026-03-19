-- Add new column for question category (standard or custom)
ALTER TABLE tour_custom_questions ADD COLUMN IF NOT EXISTS question_category TEXT DEFAULT 'custom';

-- Add new column to identify the standard question type
ALTER TABLE tour_custom_questions ADD COLUMN IF NOT EXISTS standard_field_key TEXT;

-- Add column to track if the question is active
ALTER TABLE tour_custom_questions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create a function to populate default questions for a new tour
CREATE OR REPLACE FUNCTION populate_default_questions_for_tour(p_tour_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only insert if no questions exist for this tour
  IF NOT EXISTS (SELECT 1 FROM tour_custom_questions WHERE tour_id = p_tour_id) THEN
    INSERT INTO tour_custom_questions (tour_id, question_text, question_type, is_required, order_index, question_category, standard_field_key, is_active)
    VALUES
      (p_tour_id, 'Informe seu CPF:', 'cpf', true, 1, 'standard', 'cpf', true),
      (p_tour_id, 'Qual seu nome completo?', 'text', true, 2, 'standard', 'nome_completo', true),
      (p_tour_id, 'Qual seu WhatsApp?', 'phone', true, 3, 'standard', 'whatsapp', true),
      (p_tour_id, 'Qual sua data de nascimento?', 'date', true, 4, 'standard', 'data_nascimento', true),
      (p_tour_id, 'Qual seu e-mail?', 'email', true, 5, 'standard', 'email', true),
      (p_tour_id, 'Quantas vagas deseja reservar?', 'number', true, 6, 'standard', 'numero_participantes', true),
      (p_tour_id, 'Escolha seu ponto de embarque:', 'select', true, 7, 'standard', 'ponto_embarque_id', true),
      (p_tour_id, 'Possui algum problema de saúde?', 'boolean', true, 8, 'standard', 'problema_saude', true),
      (p_tour_id, 'Descreva seu problema de saúde', 'textarea', false, 9, 'standard', 'descricao_problema_saude', true),
      (p_tour_id, 'Informe um contato de emergência (opcional)', 'emergency_contact', false, 10, 'standard', 'contato_emergencia', true),
      (p_tour_id, 'Você concorda com a Política de Reservas da Camaleão Ecoturismo?', 'policy_accept', true, 99, 'standard', 'aceita_politica', true);
  END IF;
END;
$$;

-- Create trigger to auto-populate questions when a new tour is created
CREATE OR REPLACE FUNCTION trigger_populate_tour_questions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM populate_default_questions_for_tour(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS populate_tour_questions_trigger ON tours;
CREATE TRIGGER populate_tour_questions_trigger
AFTER INSERT ON tours
FOR EACH ROW
EXECUTE FUNCTION trigger_populate_tour_questions();

-- Populate default questions for all existing tours that don't have any
DO $$
DECLARE
  tour_record RECORD;
BEGIN
  FOR tour_record IN SELECT id FROM tours WHERE id NOT IN (SELECT DISTINCT tour_id FROM tour_custom_questions)
  LOOP
    PERFORM populate_default_questions_for_tour(tour_record.id);
  END LOOP;
END;
$$;