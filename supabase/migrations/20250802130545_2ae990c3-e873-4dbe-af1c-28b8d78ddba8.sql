-- Corrigir política de RLS para permitir inserção na tabela reservas
-- O problema é que a política atual não está permitindo a inserção corretamente

-- Primeiro, remover a política existente problemática
DROP POLICY IF EXISTS "Qualquer um pode criar reservas" ON public.reservas;

-- Criar nova política mais permissiva para inserção de reservas
-- Permitir que qualquer um crie reservas (necessário para usuários não autenticados)
CREATE POLICY "Permitir criação de reservas" 
ON public.reservas 
FOR INSERT 
WITH CHECK (true);

-- Manter as outras políticas existentes para SELECT e UPDATE