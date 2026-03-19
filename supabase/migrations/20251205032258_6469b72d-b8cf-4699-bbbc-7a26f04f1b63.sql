-- Table for tour-specific costs
CREATE TABLE public.tour_costs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
    product_service TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit_value NUMERIC NOT NULL DEFAULT 0,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for monthly general costs (outside of tours)
CREATE TABLE public.monthly_general_costs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    month VARCHAR(7) NOT NULL, -- Format: "2025-01"
    year INTEGER NOT NULL,
    expense_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit_value NUMERIC NOT NULL DEFAULT 0,
    expense_type TEXT NOT NULL DEFAULT 'outros' CHECK (expense_type IN ('manutencao', 'pro_labore', 'outros')),
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_tour_costs_tour_id ON public.tour_costs(tour_id);
CREATE INDEX idx_monthly_general_costs_month ON public.monthly_general_costs(month, year);

-- Enable RLS
ALTER TABLE public.tour_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_general_costs ENABLE ROW LEVEL SECURITY;

-- RLS policies for tour_costs
CREATE POLICY "Admins can manage tour costs" ON public.tour_costs
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view tour costs" ON public.tour_costs
    FOR SELECT USING (true);

-- RLS policies for monthly_general_costs
CREATE POLICY "Admins can manage monthly general costs" ON public.monthly_general_costs
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view monthly general costs" ON public.monthly_general_costs
    FOR SELECT USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_tour_costs_updated_at
    BEFORE UPDATE ON public.tour_costs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_monthly_general_costs_updated_at
    BEFORE UPDATE ON public.monthly_general_costs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();