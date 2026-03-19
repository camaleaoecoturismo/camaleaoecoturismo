
-- Add stages to process_maps (customizable per process)
ALTER TABLE public.process_maps 
ADD COLUMN IF NOT EXISTS stages JSONB DEFAULT '[]'::jsonb;

-- Add process-related fields to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS process_map_id UUID REFERENCES public.process_maps(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS process_instance_id TEXT,
ADD COLUMN IF NOT EXISTS process_stage TEXT,
ADD COLUMN IF NOT EXISTS process_element_id TEXT;

-- Index for faster lookups of process-linked tasks
CREATE INDEX IF NOT EXISTS idx_tasks_process_instance ON public.tasks(process_instance_id) WHERE process_instance_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_process_map ON public.tasks(process_map_id) WHERE process_map_id IS NOT NULL;

-- Update process_maps status enum to support new statuses
-- (area and status are text columns, no enum constraint needed)
