-- Adicionar campo de valor padrão do passeio
ALTER TABLE public.tours 
ADD COLUMN IF NOT EXISTS valor_padrao numeric DEFAULT 0;