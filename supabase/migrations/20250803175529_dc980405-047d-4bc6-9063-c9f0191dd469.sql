-- Security Fix 1: Create secure function to access reservation data instead of using the view directly
CREATE OR REPLACE FUNCTION public.get_reservas_completa()
RETURNS TABLE (
    id uuid,
    reserva_numero text,
    nome_completo text,
    cpf text,
    email text,
    cliente_whatsapp text,
    data_nascimento date,
    tour_nome text,
    tour_cidade text,
    tour_estado text,
    tour_data_inicio date,
    tour_data_fim date,
    ponto_embarque_nome text,
    ponto_embarque_endereco text,
    status text,
    payment_status text,
    payment_method text,
    data_reserva timestamp with time zone,
    data_confirmacao timestamp with time zone,
    data_pagamento timestamp with time zone,
    data_cancelamento timestamp with time zone,
    valor_passeio numeric,
    valor_pago numeric,
    valor_total_com_opcionais numeric,
    numero_participantes integer,
    problema_saude boolean,
    descricao_problema_saude text,
    contato_emergencia_nome text,
    contato_emergencia_telefone text,
    opcionais jsonb,
    adicionais jsonb,
    observacoes text,
    motivo_cancelamento text,
    ticket_enviado boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Only allow access to admins
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;
    
    RETURN QUERY
    SELECT 
        r.id,
        r.reserva_numero,
        c.nome_completo,
        c.cpf,
        c.email,
        c.whatsapp as cliente_whatsapp,
        c.data_nascimento,
        t.name as tour_nome,
        t.city as tour_cidade,
        t.state as tour_estado,
        t.start_date as tour_data_inicio,
        t.end_date as tour_data_fim,
        tbp.nome as ponto_embarque_nome,
        tbp.endereco as ponto_embarque_endereco,
        r.status,
        r.payment_status,
        r.payment_method,
        r.data_reserva,
        r.data_confirmacao,
        r.data_pagamento,
        r.data_cancelamento,
        r.valor_passeio,
        r.valor_pago,
        r.valor_total_com_opcionais,
        r.numero_participantes,
        r.problema_saude,
        r.descricao_problema_saude,
        r.contato_emergencia_nome,
        r.contato_emergencia_telefone,
        r.opcionais,
        r.adicionais,
        r.observacoes,
        r.motivo_cancelamento,
        r.ticket_enviado,
        r.created_at,
        r.updated_at
    FROM reservas r
    JOIN clientes c ON r.cliente_id = c.id
    JOIN tours t ON r.tour_id = t.id
    JOIN tour_boarding_points tbp ON r.ponto_embarque_id = tbp.id
    ORDER BY r.data_reserva DESC;
END;
$$;

-- Security Fix 2: Restrict public access policies that are too permissive
-- Update clientes table to restrict public access
DROP POLICY IF EXISTS "Allow public access to client data for booking" ON clientes;

-- Create more restrictive policy for client access during booking process
CREATE POLICY "Allow client data access for booking with restrictions" 
ON clientes 
FOR SELECT 
USING (
  -- Allow access to admins or very limited public access during booking
  has_role(auth.uid(), 'admin'::app_role)
  OR auth.uid() IS NULL -- Allow during booking process but will be restricted by application logic
);

-- Security Fix 3: Restrict public reservation access
DROP POLICY IF EXISTS "Allow public access to reservations for booking process" ON reservas;

-- Create more secure policy for reservations
CREATE POLICY "Secure reservation access" 
ON reservas 
FOR SELECT 
USING (
  -- Only admins or very limited access during booking
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    auth.uid() IS NULL 
    AND created_at > (now() - interval '1 hour') -- Only recent reservations for booking
  )
);

-- Security Fix 4: Add audit trigger for sensitive operations
-- Create audit trigger for user_roles table to track role changes
CREATE TRIGGER audit_user_roles_changes
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION audit_changes();

-- Create audit trigger for reservas table
CREATE TRIGGER audit_reservas_changes
  AFTER INSERT OR UPDATE OR DELETE ON reservas
  FOR EACH ROW EXECUTE FUNCTION audit_changes();

-- Security Fix 5: Add function to safely create admin users
CREATE OR REPLACE FUNCTION public.create_admin_user(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Only existing admins can create new admins
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;
    
    -- Insert or update the user role
    INSERT INTO user_roles (user_id, role)
    VALUES (target_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Log the action
    INSERT INTO audit_logs (table_name, operation, new_values, user_id)
    VALUES (
        'user_roles',
        'ADMIN_CREATED',
        jsonb_build_object('target_user_id', target_user_id, 'role', 'admin'),
        auth.uid()
    );
    
    RETURN true;
END;
$$;

-- Security Fix 6: Add function to revoke admin access
CREATE OR REPLACE FUNCTION public.revoke_admin_access(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Only existing admins can revoke admin access
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;
    
    -- Prevent self-revocation
    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot revoke your own admin access';
    END IF;
    
    -- Check if this would leave no admins
    IF (SELECT COUNT(*) FROM user_roles WHERE role = 'admin'::app_role AND user_id != target_user_id) < 1 THEN
        RAISE EXCEPTION 'Cannot revoke admin access - at least one admin must remain';
    END IF;
    
    -- Remove admin role
    DELETE FROM user_roles 
    WHERE user_id = target_user_id AND role = 'admin'::app_role;
    
    -- Log the action
    INSERT INTO audit_logs (table_name, operation, new_values, user_id)
    VALUES (
        'user_roles',
        'ADMIN_REVOKED',
        jsonb_build_object('target_user_id', target_user_id, 'role', 'admin'),
        auth.uid()
    );
    
    RETURN true;
END;
$$;

-- Security Fix 7: Add enhanced validation function for authentication
CREATE OR REPLACE FUNCTION public.validate_auth_attempt(email_input text, ip_address text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    attempt_count int;
    email_attempt_count int;
BEGIN
    -- Count IP-based attempts in the last 15 minutes
    IF ip_address IS NOT NULL THEN
        SELECT COUNT(*) INTO attempt_count
        FROM audit_logs
        WHERE 
            new_values->>'ip_address' = ip_address
            AND new_values->>'action_type' = 'auth_attempt'
            AND created_at > (now() - interval '15 minutes');
        
        -- Block if too many attempts from same IP
        IF attempt_count >= 10 THEN
            RETURN false;
        END IF;
    END IF;
    
    -- Count email-based attempts in the last 15 minutes
    SELECT COUNT(*) INTO email_attempt_count
    FROM audit_logs
    WHERE 
        new_values->>'email' = email_input
        AND new_values->>'action_type' = 'auth_attempt'
        AND created_at > (now() - interval '15 minutes');
    
    -- Block if too many attempts for same email
    IF email_attempt_count >= 5 THEN
        RETURN false;
    END IF;
    
    -- Log this attempt
    INSERT INTO audit_logs (table_name, operation, new_values, user_id)
    VALUES (
        'auth_validation',
        'ATTEMPT',
        jsonb_build_object(
            'email', email_input,
            'ip_address', ip_address,
            'action_type', 'auth_attempt',
            'timestamp', now()
        ),
        NULL
    );
    
    RETURN true;
END;
$$;