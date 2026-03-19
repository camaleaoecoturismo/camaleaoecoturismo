-- Create table to track form abandonment/progress
CREATE TABLE public.form_abandonment_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  tour_id UUID REFERENCES public.tours(id) ON DELETE CASCADE,
  tour_name TEXT,
  step_reached INTEGER NOT NULL DEFAULT 1,
  last_field TEXT,
  cpf TEXT,
  nome TEXT,
  whatsapp TEXT,
  email TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed BOOLEAN NOT NULL DEFAULT false,
  converted_to_reserva BOOLEAN NOT NULL DEFAULT false,
  reserva_id UUID REFERENCES public.reservas(id) ON DELETE SET NULL,
  device_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_form_abandonment_tour_id ON public.form_abandonment_tracking(tour_id);
CREATE INDEX idx_form_abandonment_session ON public.form_abandonment_tracking(session_id);
CREATE INDEX idx_form_abandonment_completed ON public.form_abandonment_tracking(completed);
CREATE INDEX idx_form_abandonment_started ON public.form_abandonment_tracking(started_at);

-- Enable RLS
ALTER TABLE public.form_abandonment_tracking ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (form tracking doesn't require auth)
CREATE POLICY "Anyone can insert abandonment tracking"
ON public.form_abandonment_tracking
FOR INSERT
WITH CHECK (true);

-- Allow anyone to update their own session
CREATE POLICY "Anyone can update their session"
ON public.form_abandonment_tracking
FOR UPDATE
USING (true);

-- Allow authenticated admins to read all
CREATE POLICY "Authenticated users can read abandonment tracking"
ON public.form_abandonment_tracking
FOR SELECT
USING (true);