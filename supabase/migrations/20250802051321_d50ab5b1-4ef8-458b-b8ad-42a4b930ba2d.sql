-- Add financial and optional fields to reservas table
ALTER TABLE public.reservas 
ADD COLUMN valor_passeio DECIMAL(10,2) DEFAULT 0,
ADD COLUMN valor_pago DECIMAL(10,2) DEFAULT 0,
ADD COLUMN valor_total_com_opcionais DECIMAL(10,2) DEFAULT 0,
ADD COLUMN opcionais JSONB DEFAULT '{}';

-- Add comments for clarity
COMMENT ON COLUMN public.reservas.valor_passeio IS 'Valor base do passeio';
COMMENT ON COLUMN public.reservas.valor_pago IS 'Valor já pago pelo cliente';
COMMENT ON COLUMN public.reservas.valor_total_com_opcionais IS 'Valor total incluindo opcionais selecionados';
COMMENT ON COLUMN public.reservas.opcionais IS 'JSON com opcionais selecionados e seus valores';