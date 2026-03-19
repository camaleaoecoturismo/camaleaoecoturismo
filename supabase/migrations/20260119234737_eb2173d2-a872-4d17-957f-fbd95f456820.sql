-- Update get_available_spots to also count staff members in vacancy calculation
-- Staff occupies transport seats just like regular participants
CREATE OR REPLACE FUNCTION public.get_available_spots(p_tour_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total_vagas INTEGER;
  v_confirmed_participants INTEGER;
  v_staff_count INTEGER;
  v_locked_spots INTEGER;
BEGIN
  -- Get total spots from tour
  SELECT COALESCE(vagas, 0) INTO v_total_vagas
  FROM public.tours
  WHERE id = p_tour_id;
  
  -- Count participants from confirmed/paid reservations
  SELECT COALESCE(SUM(numero_participantes), 0) INTO v_confirmed_participants
  FROM public.reservas
  WHERE tour_id = p_tour_id 
    AND status IN ('confirmada', 'confirmado')
    AND payment_status IN ('confirmed', 'pago');
  
  -- Count staff members separately (they are in reservation_participants with is_staff = true)
  SELECT COUNT(*) INTO v_staff_count
  FROM public.reservation_participants rp
  INNER JOIN public.reservas r ON rp.reserva_id = r.id
  WHERE r.tour_id = p_tour_id
    AND rp.is_staff = true;
  
  -- Count currently locked spots (not expired) - for in-progress reservations
  SELECT COALESCE(SUM(spots_count), 0) INTO v_locked_spots
  FROM public.reservation_spot_locks
  WHERE tour_id = p_tour_id
    AND expires_at > NOW();
  
  RETURN v_total_vagas - v_confirmed_participants - v_staff_count - v_locked_spots;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;