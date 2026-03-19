-- Add is_active column to tours table if it doesn't exist
ALTER TABLE tours ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Create index for better performance when filtering active tours
CREATE INDEX IF NOT EXISTS idx_tours_is_active ON tours(is_active);