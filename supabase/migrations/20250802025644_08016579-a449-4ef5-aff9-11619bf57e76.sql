-- Create policies for the Camaleões table
CREATE POLICY "Anyone can view Camaleões" 
ON public."Camaleões" 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert Camaleões" 
ON public."Camaleões" 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update Camaleões" 
ON public."Camaleões" 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete Camaleões" 
ON public."Camaleões" 
FOR DELETE 
USING (auth.uid() IS NOT NULL);