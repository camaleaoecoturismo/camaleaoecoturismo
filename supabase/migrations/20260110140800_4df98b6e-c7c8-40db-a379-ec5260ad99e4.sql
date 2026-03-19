-- Add pricing_option_id column to reservation_participants to track which package each participant selected
ALTER TABLE public.reservation_participants 
ADD COLUMN IF NOT EXISTS pricing_option_id UUID REFERENCES public.tour_pricing_options(id) ON DELETE SET NULL;

-- Add pricing_option_name for denormalized quick access (in case option is deleted)
ALTER TABLE public.reservation_participants 
ADD COLUMN IF NOT EXISTS pricing_option_name TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reservation_participants_pricing_option 
ON public.reservation_participants(pricing_option_id);