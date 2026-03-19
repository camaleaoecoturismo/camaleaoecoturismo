-- Add layout_json column to store visual editor data
ALTER TABLE transport_vehicles 
ADD COLUMN IF NOT EXISTS layout_json text;

-- Add description column if not exists
ALTER TABLE transport_vehicles 
ADD COLUMN IF NOT EXISTS description text;