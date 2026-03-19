-- Fix RLS policy for clientes table to allow both authenticated and unauthenticated users to insert
DROP POLICY IF EXISTS "Qualquer um pode inserir clientes" ON public.clientes;

-- Create new policy that explicitly allows both authenticated and unauthenticated users
CREATE POLICY "Anyone can insert clientes" 
ON public.clientes 
FOR INSERT 
TO public
WITH CHECK (true);

-- Also ensure the policy for selecting clients works for unauthenticated users during reservation process
DROP POLICY IF EXISTS "Usuários autenticados podem ver todos os clientes" ON public.clientes;

CREATE POLICY "Anyone can view clientes during reservation" 
ON public.clientes 
FOR SELECT 
TO public
USING (true);