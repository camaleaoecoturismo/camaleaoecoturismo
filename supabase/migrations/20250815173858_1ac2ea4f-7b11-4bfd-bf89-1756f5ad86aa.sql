-- Drop the existing view
DROP VIEW IF EXISTS vw_reservas_completa;

-- Since we can't apply RLS directly to views, we'll rely on the existing get_reservas_completa() function
-- which already has proper admin-only access control

-- Enable RLS on all the base tables if not already enabled
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_boarding_points ENABLE ROW LEVEL SECURITY;