-- Add horario field to tour_boarding_points for boarding time
ALTER TABLE public.tour_boarding_points 
ADD COLUMN horario text;