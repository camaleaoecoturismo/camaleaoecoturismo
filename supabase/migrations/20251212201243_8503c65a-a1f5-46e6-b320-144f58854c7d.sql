-- Add amanda_status column to track Amanda's personal task status
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS amanda_status text DEFAULT 'backlog';

-- Add comment for clarity
COMMENT ON COLUMN public.tasks.amanda_status IS 'Status da tarefa no perfil de Amanda (independente do quadrant de Isaias)';