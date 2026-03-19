-- Clean up duplicate CPFs per tour (keep earliest created)
WITH duplicates AS (
  SELECT id, reserva_id, cpf, 
         ROW_NUMBER() OVER (
           PARTITION BY reserva_id, cpf 
           ORDER BY created_at ASC
         ) as rn
  FROM reservation_participants
  WHERE cpf IS NOT NULL AND cpf != ''
),
to_delete AS (
  SELECT rp.id as participant_id, t.id as ticket_id
  FROM duplicates d
  JOIN reservation_participants rp ON rp.id = d.id
  JOIN reservas r ON r.id = rp.reserva_id
  LEFT JOIN tickets t ON t.participant_id = rp.id
  WHERE d.rn > 1
)
DELETE FROM tickets WHERE id IN (SELECT ticket_id FROM to_delete WHERE ticket_id IS NOT NULL);

WITH duplicates AS (
  SELECT id, reserva_id, cpf, 
         ROW_NUMBER() OVER (
           PARTITION BY reserva_id, cpf 
           ORDER BY created_at ASC
         ) as rn
  FROM reservation_participants
  WHERE cpf IS NOT NULL AND cpf != ''
)
DELETE FROM reservation_participants 
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Now check for duplicates across same tour (different reservations, same CPF)
WITH tour_duplicates AS (
  SELECT rp.id, r.tour_id, rp.cpf,
         ROW_NUMBER() OVER (
           PARTITION BY r.tour_id, rp.cpf 
           ORDER BY rp.created_at ASC
         ) as rn
  FROM reservation_participants rp
  JOIN reservas r ON r.id = rp.reserva_id
  WHERE rp.cpf IS NOT NULL AND rp.cpf != ''
),
to_delete_tour AS (
  SELECT td.id as participant_id
  FROM tour_duplicates td
  WHERE td.rn > 1
)
DELETE FROM tickets WHERE participant_id IN (SELECT participant_id FROM to_delete_tour);

WITH tour_duplicates AS (
  SELECT rp.id, r.tour_id, rp.cpf,
         ROW_NUMBER() OVER (
           PARTITION BY r.tour_id, rp.cpf 
           ORDER BY rp.created_at ASC
         ) as rn
  FROM reservation_participants rp
  JOIN reservas r ON r.id = rp.reserva_id
  WHERE rp.cpf IS NOT NULL AND rp.cpf != ''
)
DELETE FROM reservation_participants 
WHERE id IN (SELECT id FROM tour_duplicates WHERE rn > 1);

-- Create function to validate unique CPF per tour
CREATE OR REPLACE FUNCTION public.validate_unique_cpf_per_tour()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tour_id UUID;
  v_existing_count INTEGER;
BEGIN
  -- Skip if CPF is null or empty
  IF NEW.cpf IS NULL OR NEW.cpf = '' THEN
    RETURN NEW;
  END IF;
  
  -- Get tour_id from reservation
  SELECT tour_id INTO v_tour_id FROM reservas WHERE id = NEW.reserva_id;
  
  -- Check if CPF already exists for this tour (excluding current record on update)
  SELECT COUNT(*) INTO v_existing_count
  FROM reservation_participants rp
  JOIN reservas r ON r.id = rp.reserva_id
  WHERE r.tour_id = v_tour_id
    AND rp.cpf = NEW.cpf
    AND rp.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  
  IF v_existing_count > 0 THEN
    RAISE EXCEPTION 'Este CPF já está cadastrado para esta viagem';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for unique CPF validation
DROP TRIGGER IF EXISTS validate_unique_cpf_per_tour_trigger ON reservation_participants;
CREATE TRIGGER validate_unique_cpf_per_tour_trigger
  BEFORE INSERT OR UPDATE ON reservation_participants
  FOR EACH ROW
  EXECUTE FUNCTION validate_unique_cpf_per_tour();