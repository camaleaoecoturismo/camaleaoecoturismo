-- Add column to manually close spots for a tour
ALTER TABLE public.tours 
ADD COLUMN vagas_fechadas BOOLEAN NOT NULL DEFAULT false;