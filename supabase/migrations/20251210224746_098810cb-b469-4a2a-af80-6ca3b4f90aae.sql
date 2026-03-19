-- Drop existing constraint and recreate with 'absent' status
ALTER TABLE tickets DROP CONSTRAINT tickets_status_check;

ALTER TABLE tickets ADD CONSTRAINT tickets_status_check 
CHECK (status = ANY (ARRAY['active'::text, 'used'::text, 'cancelled'::text, 'invalid'::text, 'absent'::text]));