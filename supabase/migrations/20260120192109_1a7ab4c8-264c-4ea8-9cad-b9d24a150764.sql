-- Remove trigger de auto-expiração de reservas
DROP TRIGGER IF EXISTS trigger_auto_expire_reservations ON reservas;

-- Remove função de auto-expiração ao acessar
DROP FUNCTION IF EXISTS public.auto_expire_on_access();

-- Remove função de expirar reservas pendentes
DROP FUNCTION IF EXISTS public.expire_pending_reservations();

-- Remove função que limpa spot locks expirados (se existir)
DROP FUNCTION IF EXISTS public.clean_expired_spot_locks();

-- Remove a tabela de spot locks (não é mais necessária)
DROP TABLE IF EXISTS public.reservation_spot_locks CASCADE;