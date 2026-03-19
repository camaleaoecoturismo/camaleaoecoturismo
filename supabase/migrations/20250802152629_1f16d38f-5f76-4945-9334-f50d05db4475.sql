-- Atualizar políticas RLS para tabela reservas
-- Primeiro, remover as políticas existentes que podem estar causando conflito
DROP POLICY IF EXISTS "Permitir criação de reservas" ON public.reservas;
DROP POLICY IF EXISTS "Usuários autenticados podem ver todas as reservas" ON public.reservas;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar reservas" ON public.reservas;

-- Criar nova política para permitir inserção de reservas (para qualquer usuário)
CREATE POLICY "Allow insert reservas" ON public.reservas
FOR INSERT 
WITH CHECK (true);

-- Política para visualização (apenas usuários autenticados)
CREATE POLICY "Allow select reservas for authenticated users" ON public.reservas
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Política para atualização (apenas usuários autenticados)
CREATE POLICY "Allow update reservas for authenticated users" ON public.reservas
FOR UPDATE 
USING (auth.uid() IS NOT NULL);