
-- Remove tour_id dependency, add a top-level "category" table instead
-- Drop old foreign key and column
ALTER TABLE public.atendimento_folders DROP COLUMN tour_id;

-- Add a new top-level categories table
CREATE TABLE public.atendimento_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.atendimento_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on atendimento_categories" ON public.atendimento_categories FOR ALL USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
);

-- Link folders to categories instead of tours
ALTER TABLE public.atendimento_folders ADD COLUMN category_id UUID NOT NULL REFERENCES public.atendimento_categories(id) ON DELETE CASCADE;
CREATE INDEX idx_atendimento_folders_category ON public.atendimento_folders(category_id);
