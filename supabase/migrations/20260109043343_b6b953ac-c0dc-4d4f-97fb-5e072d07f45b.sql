-- Create table for tour gallery images
CREATE TABLE public.tour_gallery_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tour_gallery_images ENABLE ROW LEVEL SECURITY;

-- Public can view all gallery images
CREATE POLICY "Anyone can view tour gallery images"
ON public.tour_gallery_images
FOR SELECT
USING (true);

-- Only authenticated users can manage gallery images
CREATE POLICY "Authenticated users can insert tour gallery images"
ON public.tour_gallery_images
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update tour gallery images"
ON public.tour_gallery_images
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete tour gallery images"
ON public.tour_gallery_images
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create index for faster queries
CREATE INDEX idx_tour_gallery_images_tour_id ON public.tour_gallery_images(tour_id);
CREATE INDEX idx_tour_gallery_images_order ON public.tour_gallery_images(tour_id, order_index);