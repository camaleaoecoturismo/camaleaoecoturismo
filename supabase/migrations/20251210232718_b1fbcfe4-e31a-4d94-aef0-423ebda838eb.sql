-- Add valor_pago column to track paid amounts per cost item
ALTER TABLE public.tour_costs 
ADD COLUMN IF NOT EXISTS valor_pago numeric NOT NULL DEFAULT 0;