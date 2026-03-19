-- Create storage bucket for tour images
INSERT INTO storage.buckets (id, name, public) VALUES ('tour-images', 'tour-images', true);

-- Create tours table
CREATE TABLE public.tours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  date DATE NOT NULL,
  pix_price DECIMAL(10,2) NOT NULL,
  card_price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  month TEXT NOT NULL,
  about TEXT,
  itinerary TEXT,
  includes TEXT,
  not_includes TEXT,
  departures TEXT,
  what_to_bring TEXT,
  policy TEXT,
  pdf_url TEXT,
  buy_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tours ENABLE ROW LEVEL SECURITY;

-- Create policies for tours (admin access only)
CREATE POLICY "Anyone can view tours" 
ON public.tours 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert tours" 
ON public.tours 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update tours" 
ON public.tours 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete tours" 
ON public.tours 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create storage policies for tour images
CREATE POLICY "Anyone can view tour images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'tour-images');

CREATE POLICY "Authenticated users can upload tour images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'tour-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update tour images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'tour-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete tour images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'tour-images' AND auth.uid() IS NOT NULL);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tours_updated_at
BEFORE UPDATE ON public.tours
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();