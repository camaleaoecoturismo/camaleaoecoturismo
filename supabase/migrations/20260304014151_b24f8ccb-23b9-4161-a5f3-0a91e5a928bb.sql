
-- Table to store journey map content (phase × dimension matrix)
CREATE TABLE public.journey_map_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phase TEXT NOT NULL, -- matches journey_phase enum values
  dimension TEXT NOT NULL, -- 'acoes_cliente', 'pontos_contato', 'sentimentos', 'humor', 'oportunidades'
  content TEXT DEFAULT '',
  mood_score INTEGER DEFAULT 3 CHECK (mood_score >= 1 AND mood_score <= 5), -- 1=muito ruim, 5=muito bom (for humor dimension)
  items JSONB DEFAULT '[]'::jsonb, -- array of checklist items for structured content
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(phase, dimension)
);

ALTER TABLE public.journey_map_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage journey map"
ON public.journey_map_entries
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_journey_map_entries_updated_at
BEFORE UPDATE ON public.journey_map_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default entries for all phase × dimension combos
INSERT INTO public.journey_map_entries (phase, dimension, content, mood_score) VALUES
  ('descobre', 'acoes_cliente', '', 3),
  ('descobre', 'pontos_contato', '', 3),
  ('descobre', 'sentimentos', '', 3),
  ('descobre', 'humor', '', 3),
  ('descobre', 'oportunidades', '', 3),
  ('confia', 'acoes_cliente', '', 3),
  ('confia', 'pontos_contato', '', 3),
  ('confia', 'sentimentos', '', 3),
  ('confia', 'humor', '', 3),
  ('confia', 'oportunidades', '', 3),
  ('compra', 'acoes_cliente', '', 3),
  ('compra', 'pontos_contato', '', 3),
  ('compra', 'sentimentos', '', 3),
  ('compra', 'humor', '', 4),
  ('compra', 'oportunidades', '', 3),
  ('se_prepara', 'acoes_cliente', '', 3),
  ('se_prepara', 'pontos_contato', '', 3),
  ('se_prepara', 'sentimentos', '', 3),
  ('se_prepara', 'humor', '', 4),
  ('se_prepara', 'oportunidades', '', 3),
  ('vive', 'acoes_cliente', '', 3),
  ('vive', 'pontos_contato', '', 3),
  ('vive', 'sentimentos', '', 3),
  ('vive', 'humor', '', 5),
  ('vive', 'oportunidades', '', 3),
  ('compartilha', 'acoes_cliente', '', 3),
  ('compartilha', 'pontos_contato', '', 3),
  ('compartilha', 'sentimentos', '', 3),
  ('compartilha', 'humor', '', 4),
  ('compartilha', 'oportunidades', '', 3),
  ('volta', 'acoes_cliente', '', 3),
  ('volta', 'pontos_contato', '', 3),
  ('volta', 'sentimentos', '', 3),
  ('volta', 'humor', '', 4),
  ('volta', 'oportunidades', '', 3);
