-- Add new columns for complete ticket customization
ALTER TABLE ticket_templates
ADD COLUMN IF NOT EXISTS website_text TEXT DEFAULT 'camaleaoecoturismo.com.br',
ADD COLUMN IF NOT EXISTS phone_text TEXT DEFAULT '(82) 99364-9454',
ADD COLUMN IF NOT EXISTS instagram_text TEXT DEFAULT '@camaleaoecoturismo',
ADD COLUMN IF NOT EXISTS price_label TEXT DEFAULT 'Tipo de ingresso',
ADD COLUMN IF NOT EXISTS passenger_label TEXT DEFAULT 'Passageiro',
ADD COLUMN IF NOT EXISTS boarding_label TEXT DEFAULT 'Embarque',
ADD COLUMN IF NOT EXISTS ticket_number_label TEXT DEFAULT 'Nº do ingresso',
ADD COLUMN IF NOT EXISTS attention_title TEXT DEFAULT 'ATENÇÃO:',
ADD COLUMN IF NOT EXISTS attention_items TEXT DEFAULT 'Chegue com 15 minutos de antecedência ao ponto de embarque
Tolerância máxima de 10 minutos para saída do ônibus
Não nos responsabilizamos por atrasos
Leve documento com foto
Use roupas e calçados confortáveis
Leve protetor solar e repelente
Não é permitido o consumo de bebidas alcoólicas durante o trajeto',
ADD COLUMN IF NOT EXISTS divider_color TEXT DEFAULT '#F59E0B',
ADD COLUMN IF NOT EXISTS header_gradient_start TEXT DEFAULT '#7C12D1',
ADD COLUMN IF NOT EXISTS header_gradient_end TEXT DEFAULT '#6309A8';