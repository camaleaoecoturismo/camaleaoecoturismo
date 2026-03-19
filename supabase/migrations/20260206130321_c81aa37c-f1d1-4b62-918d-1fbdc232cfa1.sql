
-- Create recurring_costs table for continuous monthly expenses
CREATE TABLE public.recurring_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_name TEXT NOT NULL,
  unit_value NUMERIC NOT NULL DEFAULT 0,
  expense_type TEXT NOT NULL DEFAULT 'outros',
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'pausado', 'encerrado')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recurring_costs ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (admin-only module)
CREATE POLICY "Allow all for authenticated users" ON public.recurring_costs
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_recurring_costs_updated_at
  BEFORE UPDATE ON public.recurring_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
