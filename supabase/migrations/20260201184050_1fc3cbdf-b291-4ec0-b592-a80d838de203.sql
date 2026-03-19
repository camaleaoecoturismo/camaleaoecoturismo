-- Add como_conheceu column to reservation_participants table
ALTER TABLE public.reservation_participants 
ADD COLUMN IF NOT EXISTS como_conheceu text;

-- Add comment for documentation
COMMENT ON COLUMN public.reservation_participants.como_conheceu IS 'How the participant learned about Camaleão (Instagram, WhatsApp group, referral, Google, YouTube, Other)';