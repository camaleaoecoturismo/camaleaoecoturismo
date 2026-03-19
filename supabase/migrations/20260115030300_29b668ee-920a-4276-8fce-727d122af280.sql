-- Create table for calendar opportunities (available dates for potential trips)
CREATE TABLE public.calendar_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.calendar_opportunities ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (admin access)
CREATE POLICY "Authenticated users can view opportunities" 
ON public.calendar_opportunities 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create opportunities" 
ON public.calendar_opportunities 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update opportunities" 
ON public.calendar_opportunities 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete opportunities" 
ON public.calendar_opportunities 
FOR DELETE 
TO authenticated
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_calendar_opportunities_updated_at
BEFORE UPDATE ON public.calendar_opportunities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();