-- Atualizar políticas RLS da tabela clientes para permitir inserção durante reservas

-- Remover política atual de INSERT restritiva
DROP POLICY IF EXISTS "Allow client registration during booking" ON clientes;

-- Criar nova política mais permissiva para INSERT
CREATE POLICY "Anyone can create clients during booking" 
ON clientes 
FOR INSERT 
WITH CHECK (true);

-- Atualizar política de SELECT para permitir busca por CPF durante reservas
DROP POLICY IF EXISTS "Admins can view all clients" ON clientes;

CREATE POLICY "Admins can view all clients" 
ON clientes 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Adicionar política para permitir busca de cliente por CPF durante reservas (anônimos)
CREATE POLICY "Allow CPF lookup during booking" 
ON clientes 
FOR SELECT 
USING (true);

-- Manter política de UPDATE apenas para admins
-- A política "Admins can update clients" já existe e está correta