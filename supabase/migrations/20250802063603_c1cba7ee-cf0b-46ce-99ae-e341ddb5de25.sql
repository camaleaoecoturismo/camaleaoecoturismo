-- Create a new table for tour-specific boarding points
CREATE TABLE public.tour_boarding_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  endereco TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tour_boarding_points ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view tour boarding points" 
ON public.tour_boarding_points 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage tour boarding points" 
ON public.tour_boarding_points 
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tour_boarding_points_updated_at
BEFORE UPDATE ON public.tour_boarding_points
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_tour_boarding_points_tour_id ON public.tour_boarding_points(tour_id);
CREATE INDEX idx_tour_boarding_points_order ON public.tour_boarding_points(tour_id, order_index);