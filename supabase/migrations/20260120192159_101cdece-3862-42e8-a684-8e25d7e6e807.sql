-- Atualizar função get_available_spots para não usar mais spot locks
CREATE OR REPLACE FUNCTION public.get_available_spots(p_tour_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_vagas INTEGER;
  v_confirmed_participants INTEGER;
  v_staff_count INTEGER;
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
  
  RETURN v_total_vagas - v_confirmed_participants - v_staff_count;
END;
$function$;