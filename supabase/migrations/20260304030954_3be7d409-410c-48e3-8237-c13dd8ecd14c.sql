
CREATE TABLE public.task_ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  color TEXT DEFAULT '#FEF7CD',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.task_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ideas"
ON public.task_ideas
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_task_ideas_updated_at
BEFORE UPDATE ON public.task_ideas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
