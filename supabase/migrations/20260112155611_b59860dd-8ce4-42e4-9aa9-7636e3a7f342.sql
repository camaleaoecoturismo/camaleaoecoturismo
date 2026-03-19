-- Update the trigger function to allow null ponto_embarque_id for custom boarding points
CREATE OR REPLACE FUNCTION public.validate_reserva_ponto_embarque()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip validation if ponto_embarque_id is null (custom boarding point)
    IF NEW.ponto_embarque_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Check if the boarding point belongs to this tour
    IF NOT EXISTS (
        SELECT 1 FROM public.tour_boarding_points 
        WHERE id = NEW.ponto_embarque_id AND tour_id = NEW.tour_id
    ) THEN
        RAISE EXCEPTION 'Ponto de embarque inválido para este tour';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;