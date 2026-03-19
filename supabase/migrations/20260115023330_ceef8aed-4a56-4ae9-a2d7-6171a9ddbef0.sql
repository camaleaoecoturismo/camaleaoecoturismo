-- Create table to store calendar export templates
CREATE TABLE public.calendar_export_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  
  -- Colors
  background_color TEXT DEFAULT '#ffffff',
  header_bg_color TEXT DEFAULT '#f8f9fa',
  text_color TEXT DEFAULT '#1f2937',
  tour_badge_color TEXT DEFAULT '#f97316',
  commemorative_badge_color TEXT DEFAULT '#9333ea',
  weekend_bg_color TEXT DEFAULT '#fef3c7',
  
  -- Fonts
  font_family TEXT DEFAULT 'Inter',
  title_font_size INTEGER DEFAULT 24,
  month_font_size INTEGER DEFAULT 14,
  day_font_size INTEGER DEFAULT 12,
  
  -- Layout
  cell_padding INTEGER DEFAULT 4,
  cell_height INTEGER DEFAULT 28,
  border_radius INTEGER DEFAULT 4,
  show_grid_lines BOOLEAN DEFAULT true,
  grid_line_color TEXT DEFAULT '#e5e7eb',
  
  -- Header
  show_logo BOOLEAN DEFAULT true,
  logo_url TEXT,
  title_text TEXT DEFAULT 'Agenda Anual',
  subtitle_text TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendar_export_templates ENABLE ROW LEVEL SECURITY;

-- Create policies (admin only)
CREATE POLICY "Admins can view calendar templates" 
ON public.calendar_export_templates 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admins can insert calendar templates" 
ON public.calendar_export_templates 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can update calendar templates" 
ON public.calendar_export_templates 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Admins can delete calendar templates" 
ON public.calendar_export_templates 
FOR DELETE 
TO authenticated
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_calendar_export_templates_updated_at
BEFORE UPDATE ON public.calendar_export_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();