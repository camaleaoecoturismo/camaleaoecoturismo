-- Fix payment_method for reservations where InfinitePay webhook didn't update correctly
-- This corrects reservas that have capture_method='credit_card' but payment_method='pix'
UPDATE public.reservas 
SET payment_method = 'cartao', updated_at = now()
WHERE capture_method = 'credit_card' AND payment_method = 'pix';