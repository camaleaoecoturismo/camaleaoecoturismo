
ALTER TABLE roca_settings 
ADD COLUMN IF NOT EXISTS auto_execute_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_execute_time text NOT NULL DEFAULT '19:30';
