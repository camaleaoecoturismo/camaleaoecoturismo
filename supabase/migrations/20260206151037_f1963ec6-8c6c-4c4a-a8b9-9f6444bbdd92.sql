
-- Table to store individual payment entries for each tour cost
CREATE TABLE public.tour_cost_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_cost_id UUID NOT NULL REFERENCES public.tour_costs(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  payment_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tour_cost_payments ENABLE ROW LEVEL SECURITY;

-- Admin-only policies (same pattern as tour_costs)
CREATE POLICY "Admins can manage tour cost payments"
ON public.tour_cost_payments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Index for fast lookups by tour_cost_id
CREATE INDEX idx_tour_cost_payments_tour_cost_id ON public.tour_cost_payments(tour_cost_id);

-- Trigger for updated_at
CREATE TRIGGER update_tour_cost_payments_updated_at
BEFORE UPDATE ON public.tour_cost_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
