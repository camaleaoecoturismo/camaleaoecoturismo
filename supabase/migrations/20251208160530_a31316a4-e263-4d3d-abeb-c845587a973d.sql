-- Create coupons table for discount management
CREATE TABLE public.coupons (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo TEXT NOT NULL UNIQUE,
    tipo TEXT NOT NULL CHECK (tipo IN ('porcentagem', 'valor_fixo')),
    valor NUMERIC NOT NULL CHECK (valor > 0),
    ativo BOOLEAN NOT NULL DEFAULT true,
    data_inicio DATE,
    data_fim DATE,
    maximo_usos INTEGER,
    usos_atual INTEGER NOT NULL DEFAULT 0,
    tour_id UUID REFERENCES public.tours(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add image_url column to tour_optional_items
ALTER TABLE public.tour_optional_items 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Enable RLS on coupons
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- RLS policies for coupons
CREATE POLICY "Admins can manage coupons"
ON public.coupons
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active coupons for validation"
ON public.coupons
FOR SELECT
USING (ativo = true);

-- Trigger to update updated_at
CREATE TRIGGER update_coupons_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();