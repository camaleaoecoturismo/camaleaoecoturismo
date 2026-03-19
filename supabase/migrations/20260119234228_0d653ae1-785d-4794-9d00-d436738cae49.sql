-- Fix get_available_spots to only count truly confirmed reservations
-- Pending reservations should NOT permanently block spots (only spot_locks do that temporarily)
CREATE OR REPLACE FUNCTION public.get_available_spots(p_tour_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total_vagas INTEGER;
  v_confirmed_reservations INTEGER;
  v_locked_spots INTEGER;
BEGIN
  -- Get total spots from tour
  SELECT COALESCE(vagas, 0) INTO v_total_vagas
  FROM public.tours
  WHERE id = p_tour_id;
  
  -- Count ONLY confirmed/paid reservations (not pending ones!)
  -- Pending reservations use temporary spot_locks, not permanent deduction
  SELECT COALESCE(SUM(numero_participantes), 0) INTO v_confirmed_reservations
  FROM public.reservas
  WHERE tour_id = p_tour_id 
    AND status IN ('confirmada', 'confirmado')
    AND payment_status IN ('confirmed', 'pago');
  
  -- Count currently locked spots (not expired) - these are for in-progress reservations
  SELECT COALESCE(SUM(spots_count), 0) INTO v_locked_spots
  FROM public.reservation_spot_locks
  WHERE tour_id = p_tour_id
    AND expires_at > NOW();
  
  RETURN v_total_vagas - v_confirmed_reservations - v_locked_spots;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;