-- Add column to track if user accepted marketing consent
ALTER TABLE public.interessados 
ADD COLUMN aceite_novidades boolean NOT NULL DEFAULT false;