-- Create commemorative_dates table for special dates in the calendar
CREATE TABLE public.commemorative_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.commemorative_dates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view commemorative dates" 
ON public.commemorative_dates 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage commemorative dates" 
ON public.commemorative_dates 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_commemorative_dates_updated_at
BEFORE UPDATE ON public.commemorative_dates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();