
-- Enum for journey phases
CREATE TYPE public.journey_phase AS ENUM (
  'descobre', 'confia', 'compra', 'se_prepara', 'vive', 'compartilha', 'volta'
);

-- Client journey tracking (per client, optionally per tour)
CREATE TABLE public.client_journey (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  current_phase journey_phase NOT NULL DEFAULT 'descobre',
  phase_entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tour_id UUID REFERENCES public.tours(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cliente_id, tour_id)
);

ALTER TABLE public.client_journey ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on client_journey"
  ON public.client_journey FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Journey phase transition history
CREATE TABLE public.client_journey_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  from_phase journey_phase,
  to_phase journey_phase NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  trigger_description TEXT,
  tour_id UUID REFERENCES public.tours(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_journey_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on client_journey_history"
  ON public.client_journey_history FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Phase processes (templates for each phase)
CREATE TABLE public.journey_phase_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase journey_phase NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  order_index INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.journey_phase_processes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on journey_phase_processes"
  ON public.journey_phase_processes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Task templates per phase/process
CREATE TABLE public.journey_task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID REFERENCES public.journey_phase_processes(id) ON DELETE CASCADE,
  phase journey_phase NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'manual',
  trigger_rule JSONB,
  default_days_offset INT,
  order_index INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.journey_task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on journey_task_templates"
  ON public.journey_task_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Client task instances (generated from templates or manually)
CREATE TABLE public.client_journey_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.journey_task_templates(id) ON DELETE SET NULL,
  tour_id UUID REFERENCES public.tours(id) ON DELETE SET NULL,
  phase journey_phase NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'pending',
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  assigned_to TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_journey_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on client_journey_tasks"
  ON public.client_journey_tasks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Indexes for performance
CREATE INDEX idx_client_journey_cliente ON public.client_journey(cliente_id);
CREATE INDEX idx_client_journey_phase ON public.client_journey(current_phase);
CREATE INDEX idx_client_journey_tour ON public.client_journey(tour_id);
CREATE INDEX idx_client_journey_history_cliente ON public.client_journey_history(cliente_id);
CREATE INDEX idx_client_journey_tasks_cliente ON public.client_journey_tasks(cliente_id);
CREATE INDEX idx_client_journey_tasks_status ON public.client_journey_tasks(status);
CREATE INDEX idx_client_journey_tasks_phase ON public.client_journey_tasks(phase);

-- Triggers for updated_at
CREATE TRIGGER update_client_journey_updated_at
  BEFORE UPDATE ON public.client_journey
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_journey_phase_processes_updated_at
  BEFORE UPDATE ON public.journey_phase_processes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_journey_task_templates_updated_at
  BEFORE UPDATE ON public.journey_task_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_journey_tasks_updated_at
  BEFORE UPDATE ON public.client_journey_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to move client to a phase and log history
CREATE OR REPLACE FUNCTION public.move_client_journey_phase(
  p_cliente_id UUID,
  p_to_phase journey_phase,
  p_tour_id UUID DEFAULT NULL,
  p_trigger_type TEXT DEFAULT 'manual',
  p_trigger_description TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_phase journey_phase;
BEGIN
  -- Get current phase
  SELECT current_phase INTO v_current_phase
  FROM client_journey
  WHERE cliente_id = p_cliente_id AND (tour_id = p_tour_id OR (tour_id IS NULL AND p_tour_id IS NULL));

  -- Upsert journey record
  INSERT INTO client_journey (cliente_id, current_phase, phase_entered_at, tour_id)
  VALUES (p_cliente_id, p_to_phase, now(), p_tour_id)
  ON CONFLICT (cliente_id, tour_id) DO UPDATE SET
    current_phase = p_to_phase,
    phase_entered_at = now(),
    updated_at = now();

  -- Log history
  INSERT INTO client_journey_history (cliente_id, from_phase, to_phase, trigger_type, trigger_description, tour_id)
  VALUES (p_cliente_id, v_current_phase, p_to_phase, p_trigger_type, p_trigger_description, p_tour_id);
END;
$$;
