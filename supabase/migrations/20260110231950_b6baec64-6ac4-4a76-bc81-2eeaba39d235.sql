-- Add months_limit column to coupons table for restricting coupon usage to tours within X months
ALTER TABLE public.coupons 
ADD COLUMN meses_validade integer DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.coupons.meses_validade IS 'If set, coupon can only be used for tours starting within this many months from today';