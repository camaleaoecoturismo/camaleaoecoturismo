-- Adicionar colunas faltantes na tabela reservas
ALTER TABLE public.reservas 
ADD COLUMN IF NOT EXISTS adicionais JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ticket_enviado BOOLEAN DEFAULT false;