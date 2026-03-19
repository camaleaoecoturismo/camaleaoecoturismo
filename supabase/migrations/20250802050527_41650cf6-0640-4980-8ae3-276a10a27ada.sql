-- Adicionar coluna de status de pagamento na tabela reservas
ALTER TABLE public.reservas 
ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pendente';

-- Adicionar comentário para explicar os valores possíveis
COMMENT ON COLUMN public.reservas.payment_status IS 'Status do pagamento: pendente, pago, cancelado';