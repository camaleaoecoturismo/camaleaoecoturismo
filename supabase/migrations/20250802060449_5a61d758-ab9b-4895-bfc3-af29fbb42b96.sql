-- Adicionar relação entre tours e pontos de embarque
CREATE TABLE public.tour_pontos_embarque (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  ponto_embarque_id UUID NOT NULL REFERENCES public.pontos_embarque(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tour_id, ponto_embarque_id)
);

-- Enable RLS
ALTER TABLE public.tour_pontos_embarque ENABLE ROW LEVEL SECURITY;

-- Políticas para tour_pontos_embarque
CREATE POLICY "Anyone can view tour boarding points" 
ON public.tour_pontos_embarque 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage tour boarding points" 
ON public.tour_pontos_embarque 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Criar índices para performance
CREATE INDEX idx_tour_pontos_embarque_tour_id ON public.tour_pontos_embarque(tour_id);
CREATE INDEX idx_tour_pontos_embarque_ponto_id ON public.tour_pontos_embarque(ponto_embarque_id);