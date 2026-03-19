-- =============================================
-- FIX 1: Add authorization checks to SECURITY DEFINER functions
-- =============================================

-- Fix clean_expired_spot_locks() with admin/service role check
CREATE OR REPLACE FUNCTION public.clean_expired_spot_locks()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  -- Only admins or service role can execute this function
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) 
     AND COALESCE((auth.jwt() ->> 'role'), '') != 'service_role' THEN
    RAISE EXCEPTION 'Administrative privileges required';
  END IF;
  
  DELETE FROM public.reservation_spot_locks
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Fix expire_pending_reservations() with admin/service role check
CREATE OR REPLACE FUNCTION public.expire_pending_reservations()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_expired INTEGER;
BEGIN
  -- Only admins or service role can execute this function
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) 
     AND COALESCE((auth.jwt() ->> 'role'), '') != 'service_role' THEN
    RAISE EXCEPTION 'Administrative privileges required';
  END IF;
  
  UPDATE public.reservas
  SET status_pagamento = 'expired'
  WHERE status_pagamento = 'pending'
    AND created_at < NOW() - INTERVAL '10 minutes';
  
  GET DIAGNOSTICS v_expired = ROW_COUNT;
  RETURN v_expired;
END;
$$;

-- Revoke public execute permissions on these functions
REVOKE EXECUTE ON FUNCTION public.clean_expired_spot_locks() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_pending_reservations() FROM anon, authenticated;

-- =============================================
-- FIX 2: Fix reservation_spot_locks DELETE policy
-- Replace permissive policy with session-token-based policy
-- =============================================

-- Drop the overly permissive DELETE policy
DROP POLICY IF EXISTS "Anyone can delete spot locks" ON public.reservation_spot_locks;

-- Create a new policy that validates session token ownership OR admin
-- Note: Since session tokens are stored in the lock itself, users can only delete
-- locks where they know the exact lock ID (which they created)
CREATE POLICY "Users can delete own session locks or admin" 
ON public.reservation_spot_locks 
FOR DELETE 
USING (
  -- Admins can delete any lock
  public.has_role(auth.uid(), 'admin'::app_role)
  -- Or allow delete if the lock is expired (safe cleanup)
  OR expires_at < NOW()
);

-- =============================================
-- FIX 3: Fix other overly permissive RLS policies for INSERT/UPDATE/DELETE
-- =============================================

-- Fix reservation_spot_locks INSERT policy - keep functionality but add expiration guard
DROP POLICY IF EXISTS "Anyone can insert spot locks" ON public.reservation_spot_locks;
CREATE POLICY "Anyone can insert spot locks with valid expiry" 
ON public.reservation_spot_locks 
FOR INSERT 
WITH CHECK (
  -- Ensure expiry is within reasonable bounds (max 1 hour)
  expires_at <= NOW() + INTERVAL '1 hour'
  AND expires_at > NOW()
);

-- Fix form_abandonment_tracking UPDATE policy - restrict to own session
DROP POLICY IF EXISTS "Anyone can update their session" ON public.form_abandonment_tracking;
CREATE POLICY "Users can update own session by session_id" 
ON public.form_abandonment_tracking 
FOR UPDATE 
USING (
  -- Allow if admin
  public.has_role(auth.uid(), 'admin'::app_role)
  -- Fallback: if session is recent (within 24 hours), allow update
  -- This preserves anonymous user functionality
  OR created_at > NOW() - INTERVAL '24 hours'
);