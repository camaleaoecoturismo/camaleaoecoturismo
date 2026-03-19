-- Add RLS policy for admin to read all reservas
CREATE POLICY "Admins can read all reservas"
ON public.reservas
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Add RLS policy for admin to update all reservas
CREATE POLICY "Admins can update all reservas"
ON public.reservas
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Add RLS policy for admin to insert reservas
CREATE POLICY "Admins can insert reservas"
ON public.reservas
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Add RLS policy for admin to delete reservas
CREATE POLICY "Admins can delete reservas"
ON public.reservas
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Add RLS policy for admin to read all clientes
CREATE POLICY "Admins can read all clientes"
ON public.clientes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Add RLS policy for admin to update all clientes
CREATE POLICY "Admins can update all clientes"
ON public.clientes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Add RLS policy for admin to insert clientes
CREATE POLICY "Admins can insert clientes"
ON public.clientes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Add RLS policy for admin to read all tour_boarding_points
CREATE POLICY "Admins can read all tour_boarding_points"
ON public.tour_boarding_points
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Add RLS policy for admin to manage tour_custom_columns
CREATE POLICY "Admins can manage tour_custom_columns"
ON public.tour_custom_columns
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Add RLS policy for admin to manage reservation_custom_column_values
CREATE POLICY "Admins can manage reservation_custom_column_values"
ON public.reservation_custom_column_values
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);