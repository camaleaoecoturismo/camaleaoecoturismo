-- Allow ponto_embarque_id to be null when a custom boarding point is used
ALTER TABLE public.reservas ALTER COLUMN ponto_embarque_id DROP NOT NULL;