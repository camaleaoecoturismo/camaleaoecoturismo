-- Add unique constraint on session_id + tour_id to prevent duplicates
-- First, clean up duplicates keeping only the most recent one per session+tour
DELETE FROM form_abandonment_tracking a
USING form_abandonment_tracking b
WHERE a.session_id = b.session_id 
  AND a.tour_id = b.tour_id
  AND a.created_at < b.created_at;

-- Now add unique constraint
ALTER TABLE form_abandonment_tracking 
ADD CONSTRAINT form_abandonment_tracking_session_tour_unique 
UNIQUE (session_id, tour_id);