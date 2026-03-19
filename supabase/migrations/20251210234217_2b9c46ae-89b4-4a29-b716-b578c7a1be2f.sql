-- Add expense_type column to tour_costs for categorization
ALTER TABLE public.tour_costs 
ADD COLUMN expense_type text NOT NULL DEFAULT 'outros';

-- Add auto_scale_participants column to automatically match participant count
ALTER TABLE public.tour_costs 
ADD COLUMN auto_scale_participants boolean NOT NULL DEFAULT false;

-- Create index for expense_type for future analytics queries
CREATE INDEX idx_tour_costs_expense_type ON public.tour_costs(expense_type);