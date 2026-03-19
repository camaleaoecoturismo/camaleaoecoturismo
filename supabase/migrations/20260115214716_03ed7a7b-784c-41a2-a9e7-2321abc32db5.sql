-- Add is_featured column to tours table for highlighting special tours
ALTER TABLE public.tours ADD COLUMN is_featured boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.tours.is_featured IS 'When true, the tour will be displayed with a special yellow highlight design on the main page';