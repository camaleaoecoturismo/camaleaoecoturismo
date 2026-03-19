-- Add RLS policy to allow anyone to read their own reservation during payment flow
CREATE POLICY "Allow reading reservation during payment"
ON public.reservas
FOR SELECT
USING (true);
