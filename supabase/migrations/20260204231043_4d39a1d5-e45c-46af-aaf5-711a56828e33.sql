-- Add new fields to tour_costs for optional items and pricing options auto-scaling
ALTER TABLE public.tour_costs 
ADD COLUMN IF NOT EXISTS auto_scale_optional_item_id uuid REFERENCES tour_optional_items(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS auto_scale_pricing_option_id uuid REFERENCES tour_pricing_options(id) ON DELETE SET NULL;

-- Add comments explaining the new fields
COMMENT ON COLUMN public.tour_costs.auto_scale_optional_item_id IS 'When set, quantity auto-scales to the number of participants who selected this optional item';
COMMENT ON COLUMN public.tour_costs.auto_scale_pricing_option_id IS 'When set, quantity auto-scales to the number of participants who selected this pricing option/package';