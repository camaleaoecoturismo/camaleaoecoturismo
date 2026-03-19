
-- Journey stages for the experience process map
CREATE TABLE public.experience_journey_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  icon TEXT,
  color TEXT DEFAULT 'blue',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.experience_journey_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage journey stages"
  ON public.experience_journey_stages FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Processes linked to stages
CREATE TABLE public.experience_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES public.experience_journey_stages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.experience_processes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage processes"
  ON public.experience_processes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Subprocesses linked to processes
CREATE TABLE public.experience_subprocesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES public.experience_processes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  trigger_event TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.experience_subprocesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage subprocesses"
  ON public.experience_subprocesses FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Tasks linked to subprocesses
CREATE TABLE public.experience_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subprocess_id UUID NOT NULL REFERENCES public.experience_subprocesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  responsible TEXT,
  priority TEXT DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta', 'urgente')),
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida')),
  is_automatic BOOLEAN DEFAULT false,
  trigger_event TEXT,
  due_days INTEGER,
  order_index INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.experience_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tasks"
  ON public.experience_tasks FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_experience_journey_stages_updated_at
  BEFORE UPDATE ON public.experience_journey_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_experience_processes_updated_at
  BEFORE UPDATE ON public.experience_processes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_experience_subprocesses_updated_at
  BEFORE UPDATE ON public.experience_subprocesses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_experience_tasks_updated_at
  BEFORE UPDATE ON public.experience_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the 9 default journey stages
INSERT INTO public.experience_journey_stages (name, description, order_index, icon, color) VALUES
  ('Atração', 'Como o cliente descobre a empresa', 0, 'Magnet', 'purple'),
  ('Contato', 'Primeiro contato do cliente com a empresa', 1, 'MessageCircle', 'blue'),
  ('Qualificação', 'Entendimento do perfil e necessidades do cliente', 2, 'Search', 'cyan'),
  ('Conversão', 'Realização da venda e fechamento', 3, 'ShoppingCart', 'green'),
  ('Preparação', 'Preparação do cliente e da operação para a experiência', 4, 'ClipboardList', 'amber'),
  ('Execução da Experiência', 'Momento da vivência e entrega do serviço', 5, 'Play', 'orange'),
  ('Pós-Experiência', 'Acompanhamento após a experiência', 6, 'Star', 'pink'),
  ('Relacionamento', 'Manutenção do vínculo com o cliente', 7, 'Heart', 'red'),
  ('Recorrência', 'Recompra e fidelização do cliente', 8, 'RefreshCw', 'teal');
