-- Add payment_method column to reservas table
ALTER TABLE public.reservas 
ADD COLUMN payment_method TEXT DEFAULT 'pix' CHECK (payment_method IN ('pix', 'cartao', 'pix_parcelado'));