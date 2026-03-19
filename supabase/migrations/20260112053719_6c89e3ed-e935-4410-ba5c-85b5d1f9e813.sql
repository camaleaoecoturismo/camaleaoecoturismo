-- Add seen_by_admin column to form_abandonment_tracking
ALTER TABLE public.form_abandonment_tracking
ADD COLUMN seen_by_admin boolean NOT NULL DEFAULT false;