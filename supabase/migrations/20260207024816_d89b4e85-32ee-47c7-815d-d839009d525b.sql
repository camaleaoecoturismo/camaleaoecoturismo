-- Add tour_id and is_template to process_maps for linking processes to tours
ALTER TABLE public.process_maps 
ADD COLUMN tour_id UUID REFERENCES public.tours(id) ON DELETE SET NULL,
ADD COLUMN is_template BOOLEAN NOT NULL DEFAULT false;

-- Index for fast lookup of processes by tour
CREATE INDEX idx_process_maps_tour_id ON public.process_maps(tour_id);

-- Index for templates
CREATE INDEX idx_process_maps_is_template ON public.process_maps(is_template) WHERE is_template = true;