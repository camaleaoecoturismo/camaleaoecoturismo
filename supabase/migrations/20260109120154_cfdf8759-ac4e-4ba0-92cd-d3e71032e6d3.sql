-- Add new columns to tour_gallery_images for cover selection, crop position, and caption
ALTER TABLE public.tour_gallery_images
ADD COLUMN IF NOT EXISTS is_cover boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS crop_position jsonb DEFAULT '{"x": 50, "y": 50, "scale": 1}'::jsonb,
ADD COLUMN IF NOT EXISTS caption text;

-- Add comment for documentation
COMMENT ON COLUMN public.tour_gallery_images.is_cover IS 'Whether this image is the cover image for the tour card';
COMMENT ON COLUMN public.tour_gallery_images.crop_position IS 'JSON object with x, y (0-100 percentage) and scale for card cover display';
COMMENT ON COLUMN public.tour_gallery_images.caption IS 'Optional caption shown when image is expanded';