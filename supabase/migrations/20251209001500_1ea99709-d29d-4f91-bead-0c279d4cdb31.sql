-- Add ponto_embarque_id column to reservation_participants for additional participants
ALTER TABLE public.reservation_participants
ADD COLUMN ponto_embarque_id UUID REFERENCES public.tour_boarding_points(id);

-- Add comment
COMMENT ON COLUMN public.reservation_participants.ponto_embarque_id IS 'Boarding point for additional participant (can be different from titular)';