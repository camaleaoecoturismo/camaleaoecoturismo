-- Fix question order to match the correct flow:
-- 1. Package/spots selection (numero_participantes)
-- 2. Personal data (cpf, nome, whatsapp, nascimento, email)
-- 3. Additional info (ponto_embarque, condicionamento, saude, emergencia)
-- 4. Terms and conditions (aceita_politica)
-- 5. Cancellation policy (aceita_cancelamento)

-- Move numero_participantes to first position
UPDATE form_question_templates 
SET order_index = 1 
WHERE standard_field_key = 'numero_participantes';

-- Personal data fields (2-6)
UPDATE form_question_templates 
SET order_index = 2 
WHERE standard_field_key = 'cpf';

UPDATE form_question_templates 
SET order_index = 3 
WHERE standard_field_key = 'nome_completo';

UPDATE form_question_templates 
SET order_index = 4 
WHERE standard_field_key = 'whatsapp';

UPDATE form_question_templates 
SET order_index = 5 
WHERE standard_field_key = 'data_nascimento';

UPDATE form_question_templates 
SET order_index = 6 
WHERE standard_field_key = 'email';

-- Tour info (7-8)
UPDATE form_question_templates 
SET order_index = 7 
WHERE standard_field_key = 'ponto_embarque_id';

UPDATE form_question_templates 
SET order_index = 8 
WHERE standard_field_key = 'nivel_condicionamento';

-- Health info (9-11)
UPDATE form_question_templates 
SET order_index = 9 
WHERE standard_field_key = 'problema_saude';

UPDATE form_question_templates 
SET order_index = 10 
WHERE standard_field_key = 'descricao_problema_saude';

UPDATE form_question_templates 
SET order_index = 11 
WHERE standard_field_key = 'contato_emergencia';

-- Special assistance (12-13, currently inactive)
UPDATE form_question_templates 
SET order_index = 12 
WHERE standard_field_key = 'assistencia_diferenciada';

UPDATE form_question_templates 
SET order_index = 13 
WHERE standard_field_key = 'descricao_assistencia_diferenciada';

-- Policies at the end before payment (99-100)
UPDATE form_question_templates 
SET order_index = 99 
WHERE standard_field_key = 'aceita_politica';

UPDATE form_question_templates 
SET order_index = 100 
WHERE standard_field_key = 'aceita_cancelamento';