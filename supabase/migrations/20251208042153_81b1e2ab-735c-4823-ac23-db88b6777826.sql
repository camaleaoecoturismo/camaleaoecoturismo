-- Add open_in_new_tab column to menu_items table
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS open_in_new_tab boolean NOT NULL DEFAULT false;