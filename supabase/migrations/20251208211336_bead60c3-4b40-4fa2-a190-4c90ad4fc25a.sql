-- Update condition values from 'true' to 'Sim' to match the UI button response
UPDATE tour_custom_questions 
SET condition_value = 'Sim' 
WHERE condition_field_key = 'assistencia_diferenciada' 
AND condition_value = 'true';

UPDATE form_question_templates 
SET condition_value = 'Sim' 
WHERE condition_field_key = 'assistencia_diferenciada' 
AND condition_value = 'true';