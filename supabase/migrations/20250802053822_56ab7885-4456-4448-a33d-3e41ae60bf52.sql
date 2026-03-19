-- Adicionar campos de gastos na tabela tours
ALTER TABLE public.tours 
ADD COLUMN gastos_viagem NUMERIC DEFAULT 0,
ADD COLUMN gastos_manutencao NUMERIC DEFAULT 0,
ADD COLUMN imposto_renda NUMERIC DEFAULT 0,
ADD COLUMN pro_labore NUMERIC DEFAULT 0;

-- Adicionar comentários para documentar os campos
COMMENT ON COLUMN public.tours.gastos_viagem IS 'Gastos específicos desta viagem (transporte, hospedagem, etc.)';
COMMENT ON COLUMN public.tours.gastos_manutencao IS 'Gastos de manutenção e investimentos alocados para esta viagem';
COMMENT ON COLUMN public.tours.imposto_renda IS 'Imposto de renda alocado para esta viagem';
COMMENT ON COLUMN public.tours.pro_labore IS 'Pró-labore alocado para esta viagem';