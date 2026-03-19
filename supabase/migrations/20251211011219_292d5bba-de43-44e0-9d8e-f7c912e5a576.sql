-- Add PIX discount percentage column to tours table
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS pix_discount_percent numeric DEFAULT 0;

-- Add comment explaining the column
COMMENT ON COLUMN public.tours.pix_discount_percent IS 'Percentage discount for PIX payments (e.g., 5 for 5% discount)';