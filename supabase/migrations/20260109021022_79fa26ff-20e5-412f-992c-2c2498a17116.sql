-- Função para expirar reservas pendentes após 10 minutos
CREATE OR REPLACE FUNCTION public.expire_pending_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE reservas 
    SET 
        status = 'expirada',
        payment_status = 'expirado',
        motivo_cancelamento = 'Tempo limite de pagamento excedido (10 minutos)',
        data_cancelamento = NOW(),
        updated_at = NOW()
    WHERE 
        payment_status = 'pendente'
        AND status IN ('pendente', 'aguardando')
        AND data_reserva < (NOW() - INTERVAL '10 minutes');
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$function$;

-- Executar limpeza das reservas antigas pendentes (mais de 10 minutos)
SELECT expire_pending_reservations();

-- Adicionar trigger para verificar expiração em cada consulta de reservas
-- Isso garante que reservas expiradas sejam marcadas automaticamente
CREATE OR REPLACE FUNCTION public.auto_expire_on_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Expirar reservas pendentes antigas automaticamente
    IF OLD.payment_status = 'pendente' 
       AND OLD.status IN ('pendente', 'aguardando')
       AND OLD.data_reserva < (NOW() - INTERVAL '10 minutes') THEN
        NEW.status := 'expirada';
        NEW.payment_status := 'expirado';
        NEW.motivo_cancelamento := 'Tempo limite de pagamento excedido (10 minutos)';
        NEW.data_cancelamento := NOW();
    END IF;
    RETURN NEW;
END;
$function$;

-- Criar trigger que expira automaticamente ao acessar
DROP TRIGGER IF EXISTS trigger_auto_expire_reservations ON reservas;
CREATE TRIGGER trigger_auto_expire_reservations
    BEFORE UPDATE ON reservas
    FOR EACH ROW
    EXECUTE FUNCTION auto_expire_on_access();