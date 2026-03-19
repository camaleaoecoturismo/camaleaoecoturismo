-- =============================================================
-- SECURITY FIX: Secure tickets table - restrict public access to QR validation only
-- =============================================================

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view tickets by qr_token" ON tickets;

-- Create admin-only SELECT policy for managing tickets
CREATE POLICY "Admins can select all tickets"
ON tickets FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create admin-only UPDATE policy
DROP POLICY IF EXISTS "Admins can update tickets" ON tickets;
CREATE POLICY "Admins can update tickets"
ON tickets FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Create admin-only INSERT policy
DROP POLICY IF EXISTS "Admins can insert tickets" ON tickets;
CREATE POLICY "Admins can insert tickets"
ON tickets FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Create admin-only DELETE policy
DROP POLICY IF EXISTS "Admins can delete tickets" ON tickets;
CREATE POLICY "Admins can delete tickets"
ON tickets FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =============================================================
-- Create secure RPC function for public ticket viewing by QR token
-- Returns limited ticket data needed for display (no CPF)
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_ticket_by_qr(qr_token_param uuid)
RETURNS TABLE(
  id uuid,
  ticket_number text,
  participant_name text,
  boarding_point_name text,
  boarding_point_address text,
  boarding_time text,
  trip_date date,
  amount_paid numeric,
  reservation_number text,
  status text,
  qr_token uuid,
  tour_id uuid,
  reserva_id uuid,
  checkin_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    t.id,
    t.ticket_number,
    t.participant_name,
    t.boarding_point_name,
    t.boarding_point_address,
    t.boarding_time,
    t.trip_date,
    t.amount_paid,
    t.reservation_number,
    t.status,
    t.qr_token,
    t.tour_id,
    t.reserva_id,
    t.checkin_at
  FROM tickets t
  WHERE t.qr_token = qr_token_param
  LIMIT 1;
$$;

-- Grant execute permission to all (needed for ticket viewing)
GRANT EXECUTE ON FUNCTION public.get_ticket_by_qr(uuid) TO authenticated, anon;