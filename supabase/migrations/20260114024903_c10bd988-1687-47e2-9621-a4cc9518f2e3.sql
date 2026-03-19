-- =============================================================
-- SECURITY FIX: Fix clientes table RLS to restrict public read access
-- =============================================================

-- Drop ALL existing select policies on clientes to start fresh
DROP POLICY IF EXISTS "Allow CPF lookup during booking" ON clientes;
DROP POLICY IF EXISTS "clientes_public_readonly" ON clientes;
DROP POLICY IF EXISTS "Admins can view all clients" ON clientes;

-- Create admin-only policy for reading all clients
CREATE POLICY "Admins can view all clients"
ON clientes FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Drop and recreate secure RPC function for CPF lookup during booking
DROP FUNCTION IF EXISTS public.lookup_client_by_cpf(text);

CREATE OR REPLACE FUNCTION public.lookup_client_by_cpf(search_cpf text)
RETURNS TABLE(
  id uuid, 
  nome_completo text, 
  email text, 
  whatsapp text, 
  data_nascimento date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id, 
    c.nome_completo, 
    c.email, 
    c.whatsapp, 
    c.data_nascimento
  FROM clientes c
  WHERE c.cpf = search_cpf
  LIMIT 1;
$$;

-- Grant execute permission to all (needed for booking flow)
GRANT EXECUTE ON FUNCTION public.lookup_client_by_cpf(text) TO authenticated, anon;

-- Drop existing insert/update policies
DROP POLICY IF EXISTS "Allow creating new clients" ON clientes;
DROP POLICY IF EXISTS "Allow updating client records" ON clientes;
DROP POLICY IF EXISTS "Admins can update clients" ON clientes;

-- Allow anyone to insert new clients (needed for booking)
CREATE POLICY "Allow creating new clients"
ON clientes FOR INSERT
WITH CHECK (true);

-- Allow admins to update client records
CREATE POLICY "Admins can update clients"
ON clientes FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));