-- Create table for temporary spot locks during reservation process
CREATE TABLE public.reservation_spot_locks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  spots_count INTEGER NOT NULL DEFAULT 1,
  session_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reservation_spot_locks ENABLE ROW LEVEL SECURITY;

-- Anyone can view locks (needed for availability check)
CREATE POLICY "Anyone can view spot locks" 
ON public.reservation_spot_locks 
FOR SELECT 
USING (true);

-- Anyone can insert locks (anonymous reservation flow)
CREATE POLICY "Anyone can insert spot locks" 
ON public.reservation_spot_locks 
FOR INSERT 
WITH CHECK (true);

-- Anyone can delete their own locks (using session token)
CREATE POLICY "Anyone can delete spot locks" 
ON public.reservation_spot_locks 
FOR DELETE 
USING (true);

-- Admins can manage all locks
CREATE POLICY "Admins can manage spot locks" 
ON public.reservation_spot_locks 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_reservation_spot_locks_tour_expires 
ON public.reservation_spot_locks(tour_id, expires_at);

-- Create function to get available spots for a tour
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
  
  -- Count confirmed reservations (excluding cancelled)
  SELECT COALESCE(SUM(numero_participantes), 0) INTO v_confirmed_reservations
  FROM public.reservas
  WHERE tour_id = p_tour_id 
    AND status != 'cancelado'
    AND payment_status IN ('confirmed', 'pago', 'pendente');
  
  -- Count currently locked spots (not expired)
  SELECT COALESCE(SUM(spots_count), 0) INTO v_locked_spots
  FROM public.reservation_spot_locks
  WHERE tour_id = p_tour_id
    AND expires_at > NOW();
  
  RETURN v_total_vagas - v_confirmed_reservations - v_locked_spots;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to clean expired locks (can be called periodically)
CREATE OR REPLACE FUNCTION public.clean_expired_spot_locks()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.reservation_spot_locks
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;