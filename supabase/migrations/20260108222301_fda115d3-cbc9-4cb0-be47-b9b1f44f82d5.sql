-- Add columns to reservas table for InfinitePay integration
-- These columns will store InfinitePay-specific data

ALTER TABLE public.reservas 
ADD COLUMN IF NOT EXISTS infinitepay_checkout_url text,
ADD COLUMN IF NOT EXISTS infinitepay_invoice_slug text,
ADD COLUMN IF NOT EXISTS infinitepay_transaction_nsu text,
ADD COLUMN IF NOT EXISTS receipt_url text,
ADD COLUMN IF NOT EXISTS tickets_generated boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.reservas.infinitepay_checkout_url IS 'URL do checkout InfinitePay para redirecionamento';
COMMENT ON COLUMN public.reservas.infinitepay_invoice_slug IS 'Slug da invoice na InfinitePay';
COMMENT ON COLUMN public.reservas.infinitepay_transaction_nsu IS 'NSU da transacao na InfinitePay';
COMMENT ON COLUMN public.reservas.receipt_url IS 'URL do comprovante de pagamento';
COMMENT ON COLUMN public.reservas.tickets_generated IS 'Flag para evitar geracao duplicada de tickets';