-- Remove the trigger that prevents duplicate CPF per tour
DROP TRIGGER IF EXISTS validate_unique_cpf_per_tour_trigger ON public.reservation_participants;

-- Remove the function as it's no longer needed
DROP FUNCTION IF EXISTS validate_unique_cpf_per_tour();