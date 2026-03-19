-- Add assignee column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN assignee text;

-- Add comment for clarity
COMMENT ON COLUMN public.tasks.assignee IS 'Task assignee: isaias or amanda';