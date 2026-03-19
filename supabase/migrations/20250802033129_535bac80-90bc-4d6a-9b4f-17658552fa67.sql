-- Primeiro, criar nova tabela para opções de preços
CREATE TABLE tour_pricing_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  option_name TEXT NOT NULL, -- ex: "Quarto Duplo", "Quarto Triplo", "Camping", "Pousada"
  description TEXT, -- descrição opcional da opção
  pix_price NUMERIC NOT NULL,
  card_price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar RLS policies para a nova tabela
ALTER TABLE tour_pricing_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tour pricing options" 
ON tour_pricing_options 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert tour pricing options" 
ON tour_pricing_options 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update tour pricing options" 
ON tour_pricing_options 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete tour pricing options" 
ON tour_pricing_options 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Adicionar trigger para updated_at
CREATE TRIGGER update_tour_pricing_options_updated_at
BEFORE UPDATE ON tour_pricing_options
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Alterar tabela tours para incluir start_date e end_date
ALTER TABLE tours 
ADD COLUMN start_date DATE,
ADD COLUMN end_date DATE;

-- Migrar dados existentes: copiar 'date' para 'start_date' e 'end_date'
UPDATE tours 
SET start_date = date, 
    end_date = date 
WHERE date IS NOT NULL;

-- Agora fazer start_date obrigatório
ALTER TABLE tours 
ALTER COLUMN start_date SET NOT NULL;

-- Criar opções de preço padrão para todos os tours existentes baseados nos preços atuais
INSERT INTO tour_pricing_options (tour_id, option_name, pix_price, card_price)
SELECT id, 'Padrão', pix_price, card_price 
FROM tours 
WHERE pix_price IS NOT NULL AND card_price IS NOT NULL;

-- Remover as colunas antigas de preço da tabela tours (após migrar para tour_pricing_options)
ALTER TABLE tours 
DROP COLUMN pix_price,
DROP COLUMN card_price,
DROP COLUMN date;