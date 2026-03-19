
-- 1) roca_settings - configurações globais da integração Roca
CREATE TABLE public.roca_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tokenusuario_secret TEXT, -- stored encrypted, never exposed to frontend
  carta_oferta TEXT,
  senha_secret TEXT, -- stored encrypted
  jwt_secret TEXT, -- stored encrypted
  jwt_updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.roca_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can read roca_settings"
ON public.roca_settings FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can insert roca_settings"
ON public.roca_settings FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roca_settings"
ON public.roca_settings FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
CREATE TRIGGER update_roca_settings_updated_at
BEFORE UPDATE ON public.roca_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) trip_roca_event - evento Roca vinculado a um passeio
CREATE TABLE public.trip_roca_event (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  token_evento TEXT,
  status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'ATIVO', 'CANCELADO', 'ERRO')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  raw_request JSONB,
  raw_response JSONB,
  UNIQUE(trip_id)
);

ALTER TABLE public.trip_roca_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can read trip_roca_event"
ON public.trip_roca_event FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can insert trip_roca_event"
ON public.trip_roca_event FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update trip_roca_event"
ON public.trip_roca_event FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete trip_roca_event"
ON public.trip_roca_event FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_trip_roca_event_updated_at
BEFORE UPDATE ON public.trip_roca_event
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) trip_roca_participant - participantes enviados à Roca
CREATE TABLE public.trip_roca_participant (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  participant_id UUID, -- referência interna (reserva ou reservation_participant)
  reserva_id UUID REFERENCES public.reservas(id) ON DELETE SET NULL,
  cpf TEXT NOT NULL,
  nome TEXT,
  token_participante TEXT,
  id_participante TEXT, -- idParticipante da Roca para edição
  status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'ENVIADO', 'ATIVO', 'CANCELADO', 'EXCLUIDO', 'ERRO')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  raw_request JSONB,
  raw_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(trip_id, cpf)
);

ALTER TABLE public.trip_roca_participant ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can read trip_roca_participant"
ON public.trip_roca_participant FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can insert trip_roca_participant"
ON public.trip_roca_participant FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update trip_roca_participant"
ON public.trip_roca_participant FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete trip_roca_participant"
ON public.trip_roca_participant FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_trip_roca_participant_updated_at
BEFORE UPDATE ON public.trip_roca_participant
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_trip_roca_participant_trip_id ON public.trip_roca_participant(trip_id);
CREATE INDEX idx_trip_roca_participant_cpf ON public.trip_roca_participant(cpf);
CREATE INDEX idx_trip_roca_event_trip_id ON public.trip_roca_event(trip_id);

-- 4) roca_execution_logs - log de cada execução
CREATE TABLE public.roca_execution_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.tours(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'create_event', 'sync_participants', 'add_participants', etc.
  admin_user_id UUID,
  total_confirmed INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_active INTEGER DEFAULT 0,
  total_errors INTEGER DEFAULT 0,
  error_details JSONB,
  raw_request JSONB,
  raw_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.roca_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can read roca_execution_logs"
ON public.roca_execution_logs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can insert roca_execution_logs"
ON public.roca_execution_logs FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
