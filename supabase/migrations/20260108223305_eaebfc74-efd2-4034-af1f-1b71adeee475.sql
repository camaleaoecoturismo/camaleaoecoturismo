-- Allow public insert on clientes table for reservation flow
CREATE POLICY "Allow public insert on clientes" 
ON public.clientes 
FOR INSERT 
WITH CHECK (true);

-- Also ensure analytics_sessions allows public insert for tracking
CREATE POLICY "Allow public insert on analytics_sessions" 
ON public.analytics_sessions 
FOR INSERT 
WITH CHECK (true);