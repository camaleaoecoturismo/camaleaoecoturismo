-- Update assistencia_diferenciada to boolean type (sim/não)
UPDATE tour_custom_questions
SET question_type = 'boolean',
    question_text = 'Precisa de alguma assistência diferenciada que devemos saber?'
WHERE standard_field_key = 'assistencia_diferenciada';

-- Add new field for assistencia description (conditional on yes)
INSERT INTO tour_custom_questions (tour_id, question_text, question_type, is_required, order_index, question_category, standard_field_key, is_active, options)
SELECT 
  t.id,
  'Descreva a assistência diferenciada que você precisa',
  'textarea',
  false,
  13,
  'standard',
  'descricao_assistencia_diferenciada',
  true,
  NULL
FROM tours t
WHERE NOT EXISTS (
  SELECT 1 FROM tour_custom_questions tcq 
  WHERE tcq.tour_id = t.id AND tcq.standard_field_key = 'descricao_assistencia_diferenciada'
);

-- Update policy question text to "Termos e Condições de Participação"
UPDATE tour_custom_questions
SET question_text = 'Você concorda com os Termos e Condições de Participação da Camaleão Ecoturismo?'
WHERE standard_field_key = 'aceita_politica';

-- Add new cancellation policy question
INSERT INTO tour_custom_questions (tour_id, question_text, question_type, is_required, order_index, question_category, standard_field_key, is_active, options)
SELECT 
  t.id,
  'Você concorda com a Política de Cancelamento e Alteração da Camaleão Ecoturismo?',
  'policy_accept',
  true,
  100,
  'standard',
  'aceita_cancelamento',
  true,
  NULL
FROM tours t
WHERE NOT EXISTS (
  SELECT 1 FROM tour_custom_questions tcq 
  WHERE tcq.tour_id = t.id AND tcq.standard_field_key = 'aceita_cancelamento'
);

-- Add cancellation policy to site_settings
INSERT INTO site_settings (setting_key, setting_value)
VALUES ('cancellation_policy', '<h2>Política de Cancelamento e Alteração De Data/Destino</h2>
<p>Confira a porcentagem de valor reembolsado no caso de cancelamento</p>
<table>
<thead>
<tr><th>Período</th><th>CANCELAMENTO: % do valor reembolsado</th><th>ALTERAÇÃO DE DATA/DESTINO: % do crédito disponível para uso*</th></tr>
</thead>
<tbody>
<tr><td>Até 7 dias após a compra</td><td>100%</td><td>100%</td></tr>
<tr><td>Até 30 dias antes da data de início da viagem</td><td>80%</td><td>95%</td></tr>
<tr><td>Entre 30 e 21 dias antes do início da viagem</td><td>60%</td><td>85%</td></tr>
<tr><td>Entre 21 e 7 dias antes da data de início da viagem</td><td>40%</td><td>75%</td></tr>
<tr><td>Menos de 7 dias do início da viagem</td><td>0%</td><td>0%</td></tr>
</tbody>
</table>
<p><em>*Você receberá um cupom no valor do crédito, válido por 12 meses a partir da confirmação de alteração, que pode ser aplicado em uma nova reserva em nossa loja.</em></p>')
ON CONFLICT (setting_key) DO NOTHING;

-- Update the populate function to include the new questions
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
      (p_tour_id, 'Existe alguma condição de saúde, alergia ou uso de medicamentos que possa impactar sua participação?', 'boolean', true, 9, 'standard', 'problema_saude', true, NULL),
      (p_tour_id, 'Descreva seu problema de saúde', 'textarea', false, 10, 'standard', 'descricao_problema_saude', true, NULL),
      (p_tour_id, 'Informe um contato de emergência (opcional)', 'emergency_contact', false, 11, 'standard', 'contato_emergencia', true, NULL),
      (p_tour_id, 'Precisa de alguma assistência diferenciada que devemos saber?', 'boolean', false, 12, 'standard', 'assistencia_diferenciada', true, NULL),
      (p_tour_id, 'Descreva a assistência diferenciada que você precisa', 'textarea', false, 13, 'standard', 'descricao_assistencia_diferenciada', true, NULL),
      (p_tour_id, 'Você concorda com os Termos e Condições de Participação da Camaleão Ecoturismo?', 'policy_accept', true, 99, 'standard', 'aceita_politica', true, NULL),
      (p_tour_id, 'Você concorda com a Política de Cancelamento e Alteração da Camaleão Ecoturismo?', 'policy_accept', true, 100, 'standard', 'aceita_cancelamento', true, NULL);
  END IF;
END;
$$;