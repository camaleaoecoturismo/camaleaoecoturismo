-- Allow anyone to update tickets for check-in purposes (page is password protected)
CREATE POLICY "Anyone can update tickets for checkin"
ON public.tickets
FOR UPDATE
USING (true)
WITH CHECK (true);