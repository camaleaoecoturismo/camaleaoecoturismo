-- Table to store TickTick OAuth tokens
CREATE TABLE IF NOT EXISTS public.ticktick_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table to map local tasks to TickTick tasks
CREATE TABLE IF NOT EXISTS public.task_ticktick_mapping (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  ticktick_task_id TEXT NOT NULL,
  ticktick_project_id TEXT,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id),
  UNIQUE(ticktick_task_id)
);

-- Enable RLS
ALTER TABLE public.ticktick_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_ticktick_mapping ENABLE ROW LEVEL SECURITY;

-- RLS policies - allow service role full access (used by edge functions)
CREATE POLICY "Service role full access to ticktick_integrations"
ON public.ticktick_integrations
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access to task_ticktick_mapping"
ON public.task_ticktick_mapping
FOR ALL
USING (true)
WITH CHECK (true);

-- Create updated_at trigger for ticktick_integrations
CREATE TRIGGER update_ticktick_integrations_updated_at
BEFORE UPDATE ON public.ticktick_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for task_ticktick_mapping
CREATE TRIGGER update_task_ticktick_mapping_updated_at
BEFORE UPDATE ON public.task_ticktick_mapping
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();