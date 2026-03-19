-- Add seen_by_admin column to reservas table
ALTER TABLE public.reservas 
ADD COLUMN IF NOT EXISTS seen_by_admin boolean NOT NULL DEFAULT false;

-- Add index for faster queries on unseen reservations
CREATE INDEX IF NOT EXISTS idx_reservas_seen_by_admin ON public.reservas(seen_by_admin) WHERE seen_by_admin = false;