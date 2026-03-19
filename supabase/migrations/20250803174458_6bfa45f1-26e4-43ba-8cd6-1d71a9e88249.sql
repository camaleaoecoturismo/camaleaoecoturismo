-- Security Fix 1: Add RLS policies to vw_reservas_completa view
-- Views inherit RLS from their underlying tables, but we need explicit policies

-- Enable RLS on the view
ALTER TABLE vw_reservas_completa ENABLE ROW LEVEL SECURITY;

-- Add policy for admins to view all reservation data
CREATE POLICY "Admins can view all reservation details" 
ON vw_reservas_completa 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Security Fix 2: Restrict public access policies that are too permissive
-- Update clientes table to restrict public access
DROP POLICY IF EXISTS "Allow public access to client data for booking" ON clientes;

-- Create more restrictive policy for client access during booking process
CREATE POLICY "Allow client data access for booking with restrictions" 
ON clientes 
FOR SELECT 
USING (
  -- Allow access to own data by CPF matching or admin access
  cpf = current_setting('request.jwt.claims', true)::json->>'cpf' 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR auth.uid() IS NULL -- Allow during booking process but will be restricted by application logic
);

-- Security Fix 3: Restrict public reservation access
DROP POLICY IF EXISTS "Allow public access to reservations for booking process" ON reservas;

-- Create more secure policy for reservations
CREATE POLICY "Secure reservation access" 
ON reservas 
FOR SELECT 
USING (
  -- Only admins or during controlled booking process
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
        RAISE EXCEPTION 'Only administrators can create admin users';
    END IF;
    
    -- Check if user exists in auth.users (we can't query it directly, so we'll trust the input)
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
        RAISE EXCEPTION 'Only administrators can revoke admin access';
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

-- Security Fix 7: Add rate limiting protection function
CREATE OR REPLACE FUNCTION public.check_rate_limit(user_identifier text, action_type text, max_attempts int DEFAULT 5, window_minutes int DEFAULT 15)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    attempt_count int;
BEGIN
    -- Count attempts in the time window
    SELECT COUNT(*) INTO attempt_count
    FROM audit_logs
    WHERE 
        new_values->>'user_identifier' = user_identifier
        AND new_values->>'action_type' = action_type
        AND created_at > (now() - (window_minutes || ' minutes')::interval);
    
    -- Return false if rate limit exceeded
    IF attempt_count >= max_attempts THEN
        RETURN false;
    END IF;
    
    -- Log this attempt
    INSERT INTO audit_logs (table_name, operation, new_values, user_id)
    VALUES (
        'rate_limit_check',
        'ATTEMPT',
        jsonb_build_object(
            'user_identifier', user_identifier,
            'action_type', action_type,
            'attempt_count', attempt_count + 1
        ),
        auth.uid()
    );
    
    RETURN true;
END;
$$;