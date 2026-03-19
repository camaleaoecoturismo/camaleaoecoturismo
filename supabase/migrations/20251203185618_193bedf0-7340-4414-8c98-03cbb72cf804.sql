-- Create tasks table for admin task management
CREATE TABLE public.tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    -- Kanban status: backlog, todo, in_progress, done
    status TEXT NOT NULL DEFAULT 'backlog',
    -- Eisenhower quadrant: urgent_important, not_urgent_important, urgent_not_important, not_urgent_not_important
    quadrant TEXT NOT NULL DEFAULT 'not_urgent_important',
    -- Optional link to a tour
    tour_id UUID REFERENCES public.tours(id) ON DELETE SET NULL,
    -- Priority order within status/quadrant
    order_index INTEGER NOT NULL DEFAULT 0,
    -- Due date (optional)
    due_date DATE,
    -- Completed at timestamp
    completed_at TIMESTAMP WITH TIME ZONE,
    -- Standard timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    -- User who created the task
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can manage tasks"
ON public.tasks
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_quadrant ON public.tasks(quadrant);
CREATE INDEX idx_tasks_tour_id ON public.tasks(tour_id);
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);