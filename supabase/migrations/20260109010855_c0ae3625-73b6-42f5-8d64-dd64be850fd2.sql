-- Add whatsapp_group_link column to tours table
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS whatsapp_group_link TEXT;