-- Create table for month messages
CREATE TABLE IF NOT EXISTS public.month_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month VARCHAR(3) NOT NULL,
  year INTEGER NOT NULL,
  message TEXT NOT NULL DEFAULT 'Em breve atualizações de viagens',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(month, year)
);

-- Enable RLS
ALTER TABLE public.month_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Month messages are viewable by everyone" 
ON public.month_messages 
FOR SELECT 
USING (true);

CREATE POLICY "Only authenticated users can insert month messages" 
ON public.month_messages 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can update month messages" 
ON public.month_messages 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can delete month messages" 
ON public.month_messages 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_month_messages_updated_at
BEFORE UPDATE ON public.month_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();