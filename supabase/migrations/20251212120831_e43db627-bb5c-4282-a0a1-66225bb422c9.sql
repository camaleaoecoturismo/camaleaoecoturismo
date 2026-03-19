-- Fix clientes table RLS - properly restrict public access
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow CPF lookup during booking" ON public.clientes;

-- Create proper policies:
-- 1. Admins can see all clients
-- (Already exists: "Admins can read all clientes" and "Admins can view all clients")

-- 2. Allow INSERT during booking (already exists: "Anyone can create clients during booking")

-- 3. Allow CPF lookup ONLY when querying by specific CPF - this uses a security definer function
CREATE OR REPLACE FUNCTION public.get_client_by_cpf(lookup_cpf text)
RETURNS TABLE (
  id uuid,
  cpf text,
  nome_completo text,
  email text,
  whatsapp text,
  data_nascimento date,
  contato_emergencia_nome text,
  contato_emergencia_telefone text,
  problema_saude boolean,
  descricao_problema_saude text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    cpf,
    nome_completo,
    email,
    whatsapp,
    data_nascimento,
    contato_emergencia_nome,
    contato_emergencia_telefone,
    problema_saude,
    descricao_problema_saude
  FROM clientes
  WHERE clientes.cpf = lookup_cpf
  LIMIT 1;
$$;

-- Fix email_verification_codes table RLS - create proper restrictions
DROP POLICY IF EXISTS "Allow verification code lookup by email and code" ON public.email_verification_codes;
DROP POLICY IF EXISTS "Allow marking codes as verified" ON public.email_verification_codes;
DROP POLICY IF EXISTS "Allow delete of own codes" ON public.email_verification_codes;

-- Create security definer function for code verification
CREATE OR REPLACE FUNCTION public.verify_email_code(lookup_email text, lookup_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code_record RECORD;
BEGIN
  -- Find matching unexpired, unverified code
  SELECT * INTO code_record
  FROM email_verification_codes
  WHERE email = lookup_email
    AND code = lookup_code
    AND expires_at > now()
    AND verified_at IS NULL
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Mark as verified
  UPDATE email_verification_codes
  SET verified_at = now()
  WHERE id = code_record.id;
  
  -- Delete the code after verification
  DELETE FROM email_verification_codes
  WHERE id = code_record.id;
  
  RETURN true;
END;
$$;

-- Revoke direct SELECT on email_verification_codes from anon/public
-- Keep INSERT for code generation, but SELECT should go through the security definer function
-- Create restrictive SELECT policy that blocks public browsing
CREATE POLICY "Only admins can browse verification codes"
ON public.email_verification_codes
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Keep INSERT policy for code generation
-- (Already exists: "Allow public insert for verification")

-- Allow service role to manage codes (for edge functions)
CREATE POLICY "Service role can manage verification codes"
ON public.email_verification_codes
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');