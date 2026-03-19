-- Create table for storing payment installments (parcelas)
CREATE TABLE public.reserva_parcelas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reserva_id UUID NOT NULL REFERENCES public.reservas(id) ON DELETE CASCADE,
  valor NUMERIC NOT NULL DEFAULT 0,
  data_pagamento DATE NOT NULL DEFAULT CURRENT_DATE,
  forma_pagamento TEXT NOT NULL DEFAULT 'pix',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reserva_parcelas ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can manage parcelas" 
ON public.reserva_parcelas 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view parcelas" 
ON public.reserva_parcelas 
FOR SELECT 
USING (true);

-- Create index for performance
CREATE INDEX idx_reserva_parcelas_reserva_id ON public.reserva_parcelas(reserva_id);

-- Create trigger for updating updated_at
CREATE TRIGGER update_reserva_parcelas_updated_at
BEFORE UPDATE ON public.reserva_parcelas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();