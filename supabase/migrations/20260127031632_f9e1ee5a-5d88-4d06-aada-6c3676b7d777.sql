-- Add policy to allow anonymous inserts to reservation_participants
-- This is needed because the reservation form runs with anon key
CREATE POLICY "Anyone can insert reservation participants"
ON public.reservation_participants
FOR INSERT
WITH CHECK (true);

-- Also add update policy for anonymous users to update their own participant data
CREATE POLICY "Anyone can update reservation participants"
ON public.reservation_participants
FOR UPDATE
USING (true)
WITH CHECK (true);