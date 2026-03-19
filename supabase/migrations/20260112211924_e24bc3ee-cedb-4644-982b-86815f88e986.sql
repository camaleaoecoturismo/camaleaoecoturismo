-- Add column to store optional items per participant
ALTER TABLE public.reservation_participants
ADD COLUMN IF NOT EXISTS selected_optionals jsonb DEFAULT '[]'::jsonb;

-- Add comment to explain the column
COMMENT ON COLUMN public.reservation_participants.selected_optionals IS 'Array of optional items selected for this participant: [{id, name, price, quantity}]';