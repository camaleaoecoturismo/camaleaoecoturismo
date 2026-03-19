-- Add installment tracking columns to monthly_general_costs
ALTER TABLE monthly_general_costs 
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'avista',
ADD COLUMN IF NOT EXISTS total_installments integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS current_installment integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_value numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS parent_expense_id uuid REFERENCES monthly_general_costs(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS purchase_date date;

-- Add check constraint for payment_method
ALTER TABLE monthly_general_costs 
DROP CONSTRAINT IF EXISTS monthly_general_costs_payment_method_check;

ALTER TABLE monthly_general_costs 
ADD CONSTRAINT monthly_general_costs_payment_method_check 
CHECK (payment_method IN ('avista', 'cartao'));

-- Add index for faster querying of installment chains
CREATE INDEX IF NOT EXISTS idx_monthly_general_costs_parent_expense_id 
ON monthly_general_costs(parent_expense_id);

-- Comment for documentation
COMMENT ON COLUMN monthly_general_costs.payment_method IS 'avista = cash payment, cartao = card installment';
COMMENT ON COLUMN monthly_general_costs.total_installments IS 'Total number of installments (1 for cash)';
COMMENT ON COLUMN monthly_general_costs.current_installment IS 'Current installment number (1-indexed)';
COMMENT ON COLUMN monthly_general_costs.total_value IS 'Original total value before splitting';
COMMENT ON COLUMN monthly_general_costs.parent_expense_id IS 'Reference to the first installment for grouping';
COMMENT ON COLUMN monthly_general_costs.purchase_date IS 'Date when the purchase was made';