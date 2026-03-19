-- Update the function to include the new standard question "nivel_condicionamento"
CREATE OR REPLACE FUNCTION populate_default_questions_for_tour(p_tour_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only insert if no questions exist for this tour
  IF NOT EXISTS (SELECT 1 FROM tour_custom_questions WHERE tour_id = p_tour_id) THEN
    INSERT INTO tour_custom_questions (tour_id, question_text, question_type, is_required, order_index, question_category, standard_field_key, is_active, options)
    VALUES
      (p_tour_id, 'Informe seu CPF:', 'cpf', true, 1, 'standard', 'cpf', true, NULL),
      (p_tour_id, 'Qual seu nome completo?', 'text', true, 2, 'standard', 'nome_completo', true, NULL),
      (p_tour_id, 'Qual seu WhatsApp?', 'phone', true, 3, 'standard', 'whatsapp', true, NULL),
      (p_tour_id, 'Qual sua data de nascimento?', 'date', true, 4, 'standard', 'data_nascimento', true, NULL),
      (p_tour_id, 'Qual seu e-mail?', 'email', true, 5, 'standard', 'email', true, NULL),
      (p_tour_id, 'Quantas vagas deseja reservar?', 'number', true, 6, 'standard', 'numero_participantes', true, NULL),
      (p_tour_id, 'Escolha seu ponto de embarque:', 'select', true, 7, 'standard', 'ponto_embarque_id', true, NULL),
      (p_tour_id, 'Qual o nível de condicionamento físico atual?', 'radio', true, 8, 'standard', 'nivel_condicionamento', true, 
        ARRAY['SEDENTÁRIO(A) - só de ir do quarto pra sala já perco o fôlego', 'INICIANTE - encaro caminhadas ou trilhas leves', 'INTERMEDIÁRIO - gosto de caminhar por alguns quilômetros', 'AVANÇADO - pratico atividade física regularmente (pelo menos 3x semana)', 'ATLETA - amo um desafio físico']),
      (p_tour_id, 'Possui algum problema de saúde?', 'boolean', true, 9, 'standard', 'problema_saude', true, NULL),
      (p_tour_id, 'Descreva seu problema de saúde', 'textarea', false, 10, 'standard', 'descricao_problema_saude', true, NULL),
      (p_tour_id, 'Informe um contato de emergência (opcional)', 'emergency_contact', false, 11, 'standard', 'contato_emergencia', true, NULL),
      (p_tour_id, 'Você concorda com a Política de Reservas da Camaleão Ecoturismo?', 'policy_accept', true, 99, 'standard', 'aceita_politica', true, NULL);
  END IF;
END;
$$;

-- Add the new question to all existing tours that have questions (after ponto_embarque, before problema_saude)
INSERT INTO tour_custom_questions (tour_id, question_text, question_type, is_required, order_index, question_category, standard_field_key, is_active, options)
SELECT DISTINCT 
  tour_id, 
  'Qual o nível de condicionamento físico atual?', 
  'radio', 
  true, 
  8, 
  'standard', 
  'nivel_condicionamento', 
  true,
  ARRAY['SEDENTÁRIO(A) - só de ir do quarto pra sala já perco o fôlego', 'INICIANTE - encaro caminhadas ou trilhas leves', 'INTERMEDIÁRIO - gosto de caminhar por alguns quilômetros', 'AVANÇADO - pratico atividade física regularmente (pelo menos 3x semana)', 'ATLETA - amo um desafio físico']
FROM tour_custom_questions tcq
WHERE NOT EXISTS (
  SELECT 1 FROM tour_custom_questions 
  WHERE tour_id = tcq.tour_id AND standard_field_key = 'nivel_condicionamento'
);

-- Reorder existing questions to make room for the new one (bump order_index for questions at 8+)
UPDATE tour_custom_questions
SET order_index = order_index + 1
WHERE order_index >= 8 AND order_index < 99 AND standard_field_key != 'nivel_condicionamento';