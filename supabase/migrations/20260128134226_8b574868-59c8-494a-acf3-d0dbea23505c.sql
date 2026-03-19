-- Add coupon tracking columns to reservas table
ALTER TABLE public.reservas 
ADD COLUMN IF NOT EXISTS coupon_code TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC DEFAULT 0;

-- Add index for coupon usage analytics
CREATE INDEX IF NOT EXISTS idx_reservas_coupon_code ON public.reservas(coupon_code) WHERE coupon_code IS NOT NULL;