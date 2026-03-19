-- Add unique constraint to CPF column to prevent duplicates
ALTER TABLE public.clientes 
ADD CONSTRAINT clientes_cpf_unique UNIQUE (cpf);