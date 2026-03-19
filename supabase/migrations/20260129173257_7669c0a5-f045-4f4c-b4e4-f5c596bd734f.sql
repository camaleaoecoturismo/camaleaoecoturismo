-- Criar tabela para landing pages
CREATE TABLE public.landing_pages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    meta_description TEXT,
    is_active BOOLEAN DEFAULT true,
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para os blocos/seções das páginas
CREATE TABLE public.landing_page_blocks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    page_id UUID NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
    block_type TEXT NOT NULL, -- 'hero', 'text', 'gallery', 'tours', 'testimonials', 'cta', 'tabs', 'features', 'faq'
    order_index INTEGER NOT NULL DEFAULT 0,
    title TEXT,
    subtitle TEXT,
    content JSONB DEFAULT '{}'::jsonb, -- Armazena configurações específicas de cada tipo de bloco
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para associar tours específicos às páginas
CREATE TABLE public.landing_page_tours (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    page_id UUID NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
    tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(page_id, tour_id)
);

-- Criar tabela para regiões/roteiros dentro de uma página (ex: Lençóis, Ibicoara, Mucugê)
CREATE TABLE public.landing_page_regions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    page_id UUID NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    image_url TEXT,
    color TEXT DEFAULT '#22c55e',
    order_index INTEGER DEFAULT 0,
    attractions JSONB DEFAULT '[]'::jsonb, -- Array de atrativos
    includes JSONB DEFAULT '[]'::jsonb, -- O que inclui
    logistics JSONB DEFAULT '{}'::jsonb, -- Informações logísticas
    tour_filter_tag TEXT, -- Tag para filtrar tours automaticamente
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_page_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_page_tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_page_regions ENABLE ROW LEVEL SECURITY;

-- Políticas para leitura pública (páginas ativas e publicadas)
CREATE POLICY "Páginas publicadas são públicas" 
ON public.landing_pages 
FOR SELECT 
USING (is_active = true AND is_published = true);

CREATE POLICY "Blocos de páginas publicadas são públicos" 
ON public.landing_page_blocks 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.landing_pages lp 
    WHERE lp.id = page_id AND lp.is_active = true AND lp.is_published = true
));

CREATE POLICY "Tours de páginas publicadas são públicos" 
ON public.landing_page_tours 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.landing_pages lp 
    WHERE lp.id = page_id AND lp.is_active = true AND lp.is_published = true
));

CREATE POLICY "Regiões de páginas publicadas são públicas" 
ON public.landing_page_regions 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.landing_pages lp 
    WHERE lp.id = page_id AND lp.is_active = true AND lp.is_published = true
));

-- Políticas para admin (todas as operações)
CREATE POLICY "Admins podem ver todas as páginas" 
ON public.landing_pages 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem criar páginas" 
ON public.landing_pages 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem editar páginas" 
ON public.landing_pages 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem deletar páginas" 
ON public.landing_pages 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas admin para blocos
CREATE POLICY "Admins podem ver todos os blocos" 
ON public.landing_page_blocks 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem gerenciar blocos" 
ON public.landing_page_blocks 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas admin para tours da página
CREATE POLICY "Admins podem ver todos os tours das páginas" 
ON public.landing_page_tours 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem gerenciar tours das páginas" 
ON public.landing_page_tours 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas admin para regiões
CREATE POLICY "Admins podem ver todas as regiões" 
ON public.landing_page_regions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem gerenciar regiões" 
ON public.landing_page_regions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers para updated_at
CREATE TRIGGER update_landing_pages_updated_at
    BEFORE UPDATE ON public.landing_pages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_landing_page_blocks_updated_at
    BEFORE UPDATE ON public.landing_page_blocks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_landing_page_regions_updated_at
    BEFORE UPDATE ON public.landing_page_regions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir a página da Chapada Diamantina como exemplo inicial
INSERT INTO public.landing_pages (slug, title, meta_description, is_active, is_published)
VALUES (
    'chapada-diamantina',
    'Chapada Diamantina',
    'Explore a Chapada Diamantina com a Camaleão Ecoturismo. Roteiros exclusivos em Lençóis, Ibicoara e Mucugê.',
    true,
    true
);