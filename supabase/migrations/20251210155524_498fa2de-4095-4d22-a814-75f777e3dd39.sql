-- Create waitlist_entries table
CREATE TABLE public.waitlist_entries (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
    nome_completo TEXT NOT NULL,
    numero_vagas INTEGER NOT NULL DEFAULT 1,
    whatsapp TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can insert waitlist entries" 
ON public.waitlist_entries 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can manage waitlist entries" 
ON public.waitlist_entries 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view waitlist entries" 
ON public.waitlist_entries 
FOR SELECT 
USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_waitlist_entries_updated_at
BEFORE UPDATE ON public.waitlist_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for tour_id queries
CREATE INDEX idx_waitlist_entries_tour_id ON public.waitlist_entries(tour_id);
CREATE INDEX idx_waitlist_entries_created_at ON public.waitlist_entries(created_at);