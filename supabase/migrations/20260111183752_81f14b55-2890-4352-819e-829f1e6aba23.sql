-- Adicionar campos de plano de saúde na tabela reservation_participants
ALTER TABLE public.reservation_participants
ADD COLUMN IF NOT EXISTS plano_saude boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS nome_plano_saude text;

-- Adicionar campos de plano de saúde na tabela reservas (para o titular)
ALTER TABLE public.reservas
ADD COLUMN IF NOT EXISTS plano_saude boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS nome_plano_saude text;