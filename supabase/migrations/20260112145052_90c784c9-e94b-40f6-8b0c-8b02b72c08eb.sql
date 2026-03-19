-- Add custom boarding point field to reservation_participants
ALTER TABLE public.reservation_participants 
ADD COLUMN IF NOT EXISTS ponto_embarque_personalizado TEXT;