-- Criar tabela para mapas de processos
CREATE TABLE public.process_maps (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    area TEXT NOT NULL DEFAULT 'Operação',
    status TEXT NOT NULL DEFAULT 'Em construção',
    elements JSONB NOT NULL DEFAULT '[]'::jsonb,
    connections JSONB NOT NULL DEFAULT '[]'::jsonb,
    canvas_settings JSONB DEFAULT '{"width": 1200, "height": 800}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.process_maps ENABLE ROW LEVEL SECURITY;

-- Policies for admin access only
CREATE POLICY "Admins can manage process maps" 
ON public.process_maps 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_process_maps_updated_at
BEFORE UPDATE ON public.process_maps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.process_maps IS 'Mapas visuais de processos empresariais';
COMMENT ON COLUMN public.process_maps.area IS 'Área da empresa: Estratégia, Operação, Marketing, Financeiro';
COMMENT ON COLUMN public.process_maps.status IS 'Status: Em construção, Validado';
COMMENT ON COLUMN public.process_maps.elements IS 'Blocos do fluxograma: processo, decisão, início, fim';
COMMENT ON COLUMN public.process_maps.connections IS 'Setas conectando os elementos com rótulos';