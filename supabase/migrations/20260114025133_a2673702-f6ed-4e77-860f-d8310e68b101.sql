-- Create secure RPC function for client lookup by email during login
CREATE OR REPLACE FUNCTION public.lookup_client_by_email(search_email text)
RETURNS TABLE(id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id
  FROM clientes c
  WHERE c.email = search_email
  LIMIT 1;
$$;

-- Grant execute permission to all (needed for login flow)
GRANT EXECUTE ON FUNCTION public.lookup_client_by_email(text) TO authenticated, anon;