-- 1) RLS POLICY HARDENING

-- Clientes: remove anonymous SELECT access
DROP POLICY IF EXISTS "Allow client data access for booking with restrictions" ON public.clientes;

-- Reservas: remove anonymous recent-rows SELECT access
DROP POLICY IF EXISTS "Secure reservation access" ON public.reservas;

-- tour_pricing_options: restrict mutations to admins only
DROP POLICY IF EXISTS "Authenticated users can delete tour pricing options" ON public.tour_pricing_options;
DROP POLICY IF EXISTS "Authenticated users can insert tour pricing options" ON public.tour_pricing_options;
DROP POLICY IF EXISTS "Authenticated users can update tour pricing options" ON public.tour_pricing_options;

CREATE POLICY "Admins can insert tour pricing options"
ON public.tour_pricing_options
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update tour pricing options"
ON public.tour_pricing_options
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete tour pricing options"
ON public.tour_pricing_options
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- tour_pontos_embarque: restrict management to admins only
DROP POLICY IF EXISTS "Authenticated users can manage tour boarding points" ON public.tour_pontos_embarque;

CREATE POLICY "Admins can manage tour boarding points"
ON public.tour_pontos_embarque
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2) REVOKE PUBLIC ACCESS TO SENSITIVE VIEW
DO $$ BEGIN
  PERFORM 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'vw_reservas_completa';
  IF FOUND THEN
    REVOKE ALL ON TABLE public.vw_reservas_completa FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

-- 3) CREATE MISSING SEQUENCE (if needed) USED BY generate_reserva_numero
CREATE SEQUENCE IF NOT EXISTS public.reserva_numero_seq;

-- 4) TRIGGERS: VALIDATION, TIMESTAMPS, AUDIT

-- Clientes
DROP TRIGGER IF EXISTS validate_cliente_data_trigger ON public.clientes;
CREATE TRIGGER validate_cliente_data_trigger
BEFORE INSERT OR UPDATE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.validate_cliente_data();

DROP TRIGGER IF EXISTS clientes_set_updated_at ON public.clientes;
CREATE TRIGGER clientes_set_updated_at
BEFORE UPDATE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS audit_clientes_trigger ON public.clientes;
CREATE TRIGGER audit_clientes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.audit_changes();

-- Reservas
DROP TRIGGER IF EXISTS validate_reserva_data_trigger ON public.reservas;
CREATE TRIGGER validate_reserva_data_trigger
BEFORE INSERT OR UPDATE ON public.reservas
FOR EACH ROW EXECUTE FUNCTION public.validate_reserva_data();

DROP TRIGGER IF EXISTS generate_reserva_numero_trigger ON public.reservas;
CREATE TRIGGER generate_reserva_numero_trigger
BEFORE INSERT ON public.reservas
FOR EACH ROW EXECUTE FUNCTION public.generate_reserva_numero();

DROP TRIGGER IF EXISTS update_reserva_timestamps_trigger ON public.reservas;
CREATE TRIGGER update_reserva_timestamps_trigger
BEFORE UPDATE ON public.reservas
FOR EACH ROW EXECUTE FUNCTION public.update_reserva_timestamps();

DROP TRIGGER IF EXISTS reservas_set_updated_at ON public.reservas;
CREATE TRIGGER reservas_set_updated_at
BEFORE UPDATE ON public.reservas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS audit_reservas_trigger ON public.reservas;
CREATE TRIGGER audit_reservas_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.reservas
FOR EACH ROW EXECUTE FUNCTION public.audit_changes();

-- Tours
DROP TRIGGER IF EXISTS tours_set_updated_at ON public.tours;
CREATE TRIGGER tours_set_updated_at
BEFORE UPDATE ON public.tours
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS audit_tours_trigger ON public.tours;
CREATE TRIGGER audit_tours_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.tours
FOR EACH ROW EXECUTE FUNCTION public.audit_changes();

-- tour_boarding_points
DROP TRIGGER IF EXISTS tour_boarding_points_set_updated_at ON public.tour_boarding_points;
CREATE TRIGGER tour_boarding_points_set_updated_at
BEFORE UPDATE ON public.tour_boarding_points
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS audit_tour_boarding_points_trigger ON public.tour_boarding_points;
CREATE TRIGGER audit_tour_boarding_points_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.tour_boarding_points
FOR EACH ROW EXECUTE FUNCTION public.audit_changes();

-- tour_custom_questions
DROP TRIGGER IF EXISTS tour_custom_questions_set_updated_at ON public.tour_custom_questions;
CREATE TRIGGER tour_custom_questions_set_updated_at
BEFORE UPDATE ON public.tour_custom_questions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS audit_tour_custom_questions_trigger ON public.tour_custom_questions;
CREATE TRIGGER audit_tour_custom_questions_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.tour_custom_questions
FOR EACH ROW EXECUTE FUNCTION public.audit_changes();

-- tour_pricing_options
DROP TRIGGER IF EXISTS tour_pricing_options_set_updated_at ON public.tour_pricing_options;
CREATE TRIGGER tour_pricing_options_set_updated_at
BEFORE UPDATE ON public.tour_pricing_options
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS audit_tour_pricing_options_trigger ON public.tour_pricing_options;
CREATE TRIGGER audit_tour_pricing_options_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.tour_pricing_options
FOR EACH ROW EXECUTE FUNCTION public.audit_changes();

-- reservation_custom_answers
DROP TRIGGER IF EXISTS audit_reservation_custom_answers_trigger ON public.reservation_custom_answers;
CREATE TRIGGER audit_reservation_custom_answers_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.reservation_custom_answers
FOR EACH ROW EXECUTE FUNCTION public.audit_changes();

-- user_roles
DROP TRIGGER IF EXISTS audit_user_roles_trigger ON public.user_roles;
CREATE TRIGGER audit_user_roles_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_changes();

-- 5) HARDEN SECURITY DEFINER RPCs

CREATE OR REPLACE FUNCTION public.cancelar_reserva(reserva_id uuid, motivo text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Only admins can cancel reservations
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;

    UPDATE reservas 
    SET 
        status = 'cancelada',
        data_cancelamento = NOW(),
        motivo_cancelamento = motivo,
        updated_at = NOW()
    WHERE id = reserva_id 
      AND status != 'cancelada';
    
    RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.confirmar_pagamento(reserva_id uuid, valor_pago_input numeric DEFAULT NULL::numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Only admins can confirm payments
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;

    UPDATE reservas 
    SET 
        payment_status = 'pago',
        data_pagamento = NOW(),
        valor_pago = COALESCE(valor_pago_input, valor_total_com_opcionais),
        status = CASE WHEN status = 'pendente' THEN 'confirmada' ELSE status END,
        updated_at = NOW()
    WHERE id = reserva_id 
      AND payment_status != 'pago';
    
    RETURN FOUND;
END;
$function$;

-- Rate-limit CPF lookup attempts similar to validate_auth_attempt
CREATE OR REPLACE FUNCTION public.validate_cpf_lookup(cpf_input text, ip_address text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    attempt_count int;
    cpf_attempt_count int;
BEGIN
    -- IP-based attempts in the last 15 minutes
    IF ip_address IS NOT NULL THEN
        SELECT COUNT(*) INTO attempt_count
        FROM audit_logs
        WHERE 
            new_values->>'ip_address' = ip_address
            AND new_values->>'action_type' = 'cpf_lookup'
            AND created_at > (now() - interval '15 minutes');
        IF attempt_count >= 20 THEN
            RETURN false;
        END IF;
    END IF;

    -- CPF-based attempts in the last 15 minutes
    SELECT COUNT(*) INTO cpf_attempt_count
    FROM audit_logs
    WHERE 
        new_values->>'cpf' = cpf_input
        AND new_values->>'action_type' = 'cpf_lookup'
        AND created_at > (now() - interval '15 minutes');
    IF cpf_attempt_count >= 5 THEN
        RETURN false;
    END IF;

    -- Log this attempt
    INSERT INTO audit_logs (table_name, operation, new_values, user_id)
    VALUES (
        'cpf_validation',
        'ATTEMPT',
        jsonb_build_object(
            'cpf', cpf_input,
            'ip_address', ip_address,
            'action_type', 'cpf_lookup',
            'timestamp', now()
        ),
        NULL
    );

    RETURN true;
END;
$function$;

-- Update get_cliente_reservas: validate CPF and rate-limit lookup
CREATE OR REPLACE FUNCTION public.get_cliente_reservas(cliente_cpf text)
RETURNS TABLE(
    reserva_id uuid,
    reserva_numero text,
    tour_nome text,
    status text,
    payment_status text,
    data_reserva timestamp with time zone,
    valor_total numeric,
    tour_data_inicio date,
    ponto_embarque text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    allowed boolean;
BEGIN
    -- Validate CPF format
    IF NOT validate_cpf(cliente_cpf) THEN
        RAISE EXCEPTION 'CPF inválido';
    END IF;

    -- Basic rate limiting based on CPF attempts
    SELECT validate_cpf_lookup(cliente_cpf, NULL) INTO allowed;
    IF NOT allowed THEN
        RAISE EXCEPTION 'Muitas tentativas. Tente novamente mais tarde.';
    END IF;

    RETURN QUERY
    SELECT 
        r.id,
        r.reserva_numero,
        t.name,
        r.status::TEXT,
        r.payment_status::TEXT,
        r.data_reserva,
        r.valor_total_com_opcionais,
        t.start_date,
        tbp.nome
    FROM reservas r
    JOIN clientes c ON r.cliente_id = c.id
    JOIN tours t ON r.tour_id = t.id
    JOIN tour_boarding_points tbp ON r.ponto_embarque_id = tbp.id
    WHERE c.cpf = cliente_cpf
    ORDER BY r.data_reserva DESC;
END;
$function$;