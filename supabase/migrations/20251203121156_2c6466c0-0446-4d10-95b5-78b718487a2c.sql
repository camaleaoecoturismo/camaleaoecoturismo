-- Create table for calendar-only tours (not for public sale)
CREATE TABLE public.calendar_only_tours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendar_only_tours ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage calendar only tours" 
ON public.calendar_only_tours 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view calendar only tours" 
ON public.calendar_only_tours 
FOR SELECT 
USING (true);