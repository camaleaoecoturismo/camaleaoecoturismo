-- Tornar campos de contato de emergência opcionais na tabela reservas
ALTER TABLE public.reservas 
ALTER COLUMN contato_emergencia_nome DROP NOT NULL;

ALTER TABLE public.reservas 
ALTER COLUMN contato_emergencia_telefone DROP NOT NULL;

-- Definir valores padrão como NULL
ALTER TABLE public.reservas 
ALTER COLUMN contato_emergencia_nome SET DEFAULT NULL;

ALTER TABLE public.reservas 
ALTER COLUMN contato_emergencia_telefone SET DEFAULT NULL;