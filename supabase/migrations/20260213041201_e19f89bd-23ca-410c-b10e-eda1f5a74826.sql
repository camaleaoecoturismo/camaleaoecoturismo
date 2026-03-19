
-- Delete duplicate tickets, keeping the one created first (oldest)
DELETE FROM tickets
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (
             PARTITION BY REGEXP_REPLACE(COALESCE(participant_cpf, ''), '[^0-9]', '', 'g'), reserva_id 
             ORDER BY created_at ASC
           ) as rn
    FROM tickets
    WHERE status IN ('active', 'used', 'absent')
    AND REGEXP_REPLACE(COALESCE(participant_cpf, ''), '[^0-9]', '', 'g') != ''
  ) sub
  WHERE rn > 1
);

-- Also add a unique index to prevent future duplicates (normalized CPF + reserva_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_unique_cpf_reserva 
ON tickets (REGEXP_REPLACE(COALESCE(participant_cpf, ''), '[^0-9]', '', 'g'), reserva_id)
WHERE status != 'cancelled' 
AND REGEXP_REPLACE(COALESCE(participant_cpf, ''), '[^0-9]', '', 'g') != '';
