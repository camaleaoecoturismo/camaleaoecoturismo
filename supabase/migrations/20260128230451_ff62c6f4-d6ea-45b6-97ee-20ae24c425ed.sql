-- Create table for interested leads who access the itinerary PDF
CREATE TABLE public.interessados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  passeio_id UUID REFERENCES public.tours(id) ON DELETE CASCADE NOT NULL,
  origem TEXT NOT NULL DEFAULT 'roteiro',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent duplicates (same whatsapp + same tour)
CREATE UNIQUE INDEX interessados_whatsapp_passeio_unique ON public.interessados (whatsapp, passeio_id);

-- Enable RLS
ALTER TABLE public.interessados ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can insert (for the form submission)
CREATE POLICY "Anyone can insert interessados" 
ON public.interessados 
FOR INSERT 
WITH CHECK (true);

-- Admins can view all interessados
CREATE POLICY "Admins can view interessados" 
ON public.interessados 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete interessados
CREATE POLICY "Admins can delete interessados" 
ON public.interessados 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for faster queries
CREATE INDEX interessados_passeio_id_idx ON public.interessados(passeio_id);
CREATE INDEX interessados_created_at_idx ON public.interessados(created_at DESC);