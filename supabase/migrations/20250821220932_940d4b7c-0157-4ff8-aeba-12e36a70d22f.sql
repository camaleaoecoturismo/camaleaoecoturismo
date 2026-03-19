-- Create menu_items table for dynamic menu management
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Create policies for menu items
CREATE POLICY "Anyone can view active menu items" 
ON public.menu_items 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage menu items" 
ON public.menu_items 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_menu_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_menu_items_updated_at
BEFORE UPDATE ON public.menu_items
FOR EACH ROW
EXECUTE FUNCTION public.update_menu_items_updated_at();

-- Insert default menu items
INSERT INTO public.menu_items (name, url, order_index) VALUES
('Início', 'https://www.camaleaoecoturismo.com/home', 1),
('Agenda da Camaleão', 'https://www.agenda.camaleaoecoturismo.com/', 2),
('Política de Reservas', 'https://www.camaleaoecoturismo.com/politica-de-reservas', 3),
('Blog da Camaleão', 'https://www.camaleaoecoturismo.com/blogdacamaleao', 4),
('Quem somos nós', 'https://www.camaleaoecoturismo.com/sobre-nos', 5),
('Colaboradores', 'https://www.camaleaoecoturismo.com/colaboradores', 6),
('Camaleão na mídia', 'https://www.camaleaoecoturismo.com/camaleao-na-midia', 7),
('Contato', 'https://www.camaleaoecoturismo.com/contato', 8);