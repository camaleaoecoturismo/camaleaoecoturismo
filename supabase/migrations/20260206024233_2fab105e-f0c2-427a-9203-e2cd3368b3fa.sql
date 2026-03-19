-- Remove the existing constraint on expense_type if it exists and update to allow more types
-- First, let's check if there's an enum or check constraint and update it

-- Update the expense_type column to accept more values by altering the check constraint
ALTER TABLE monthly_general_costs 
DROP CONSTRAINT IF EXISTS monthly_general_costs_expense_type_check;

-- Add new check constraint with all expense types
ALTER TABLE monthly_general_costs 
ADD CONSTRAINT monthly_general_costs_expense_type_check 
CHECK (expense_type IN ('manutencao', 'investimento', 'equipamento', 'marketing', 'administrativo', 'imposto', 'outros', 'pro_labore'));