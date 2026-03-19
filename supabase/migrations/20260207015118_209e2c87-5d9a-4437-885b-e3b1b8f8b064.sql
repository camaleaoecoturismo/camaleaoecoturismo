
-- Create task steps table
CREATE TABLE public.task_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_steps ENABLE ROW LEVEL SECURITY;

-- Admin-only policies (same pattern as tasks)
CREATE POLICY "Allow all for authenticated users" ON public.task_steps
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Index for fast lookup
CREATE INDEX idx_task_steps_task_id ON public.task_steps(task_id);

-- Trigger for updated_at
CREATE TRIGGER update_task_steps_updated_at
  BEFORE UPDATE ON public.task_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
