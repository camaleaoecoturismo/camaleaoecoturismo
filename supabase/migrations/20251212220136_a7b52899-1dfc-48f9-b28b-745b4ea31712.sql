-- Add task_duration column to persist duration set in agenda view
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT 60;

-- Add comment for clarity
COMMENT ON COLUMN public.tasks.duration_minutes IS 'Duration of task in minutes for agenda view (default 60 minutes)';