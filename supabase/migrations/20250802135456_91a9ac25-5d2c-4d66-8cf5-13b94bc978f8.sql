-- Adicionar campos de problemas de saúde e contato de emergência na tabela clientes
ALTER TABLE public.clientes 
ADD COLUMN problema_saude boolean DEFAULT false,
ADD COLUMN descricao_problema_saude text,
ADD COLUMN contato_emergencia_nome text,
ADD COLUMN contato_emergencia_telefone text;