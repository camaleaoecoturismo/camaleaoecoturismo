-- Corrigir status das reservas históricas de 2025 para 'confirmado'
UPDATE public.reservas 
SET status = 'confirmado' 
WHERE capture_method = 'historico';