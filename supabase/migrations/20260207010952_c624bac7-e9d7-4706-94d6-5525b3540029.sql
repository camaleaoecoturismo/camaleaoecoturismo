
-- Folders for organizing messages per tour
CREATE TABLE public.atendimento_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Messages within folders
CREATE TABLE public.atendimento_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id UUID NOT NULL REFERENCES public.atendimento_folders(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.atendimento_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atendimento_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on atendimento_folders" ON public.atendimento_folders FOR ALL USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
);

CREATE POLICY "Admin full access on atendimento_messages" ON public.atendimento_messages FOR ALL USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
);

CREATE INDEX idx_atendimento_folders_tour ON public.atendimento_folders(tour_id);
CREATE INDEX idx_atendimento_messages_folder ON public.atendimento_messages(folder_id);
