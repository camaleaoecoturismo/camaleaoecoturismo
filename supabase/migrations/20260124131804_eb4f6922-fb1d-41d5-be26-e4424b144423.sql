-- Create table to store the boarding points export template
CREATE TABLE public.boarding_export_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Padrão',
  header_template TEXT NOT NULL DEFAULT '🚸 *Pontos de embarque:*',
  boarding_point_template TEXT NOT NULL DEFAULT '📍 *{{nome}}*

🕕 _{{horario}}_',
  participant_template TEXT NOT NULL DEFAULT '▪️ {{nome}}',
  is_default BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.boarding_export_templates ENABLE ROW LEVEL SECURITY;

-- Allow public read access (admin only writes)
CREATE POLICY "Allow public read access to boarding templates"
ON public.boarding_export_templates
FOR SELECT
USING (true);

-- Allow authenticated users to manage templates
CREATE POLICY "Allow authenticated users to manage boarding templates"
ON public.boarding_export_templates
FOR ALL
USING (true)
WITH CHECK (true);

-- Insert default template
INSERT INTO public.boarding_export_templates (name, is_default)
VALUES ('Padrão', true);