-- =============================================
-- LOJA INTEGRADA AO CHECKOUT - FASE 1
-- =============================================

-- Categorias de produtos
CREATE TABLE public.shop_categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Produtos
CREATE TABLE public.shop_products (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    short_description TEXT,
    full_description TEXT,
    category_id UUID REFERENCES public.shop_categories(id) ON DELETE SET NULL,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    show_in_checkout BOOLEAN DEFAULT true,
    checkout_order INTEGER DEFAULT 0,
    has_stock_control BOOLEAN DEFAULT false,
    stock_quantity INTEGER DEFAULT 0,
    out_of_stock_behavior TEXT DEFAULT 'hide', -- 'hide' or 'disable'
    show_in_all_tours BOOLEAN DEFAULT true,
    has_variations BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Imagens de produtos
CREATE TABLE public.shop_product_images (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    is_cover BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Atributos de variação (ex: Cor, Tamanho, Numeração)
CREATE TABLE public.shop_attributes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Valores de atributos (ex: P, M, G para Tamanho)
CREATE TABLE public.shop_attribute_values (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    attribute_id UUID NOT NULL REFERENCES public.shop_attributes(id) ON DELETE CASCADE,
    value TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Atributos habilitados por produto
CREATE TABLE public.shop_product_attributes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
    attribute_id UUID NOT NULL REFERENCES public.shop_attributes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(product_id, attribute_id)
);

-- Variações do produto (combinações de atributos com estoque próprio)
CREATE TABLE public.shop_product_variations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
    variation_values JSONB NOT NULL DEFAULT '{}', -- ex: {"cor": "Preto", "tamanho": "M"}
    sku TEXT,
    price_adjustment NUMERIC(10,2) DEFAULT 0, -- ajuste de preço (+ ou -)
    stock_quantity INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Produtos vinculados a passeios específicos
CREATE TABLE public.shop_product_tours (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
    tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(product_id, tour_id)
);

-- Itens da loja comprados (vinculados à reserva)
CREATE TABLE public.shop_order_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    reserva_id UUID NOT NULL REFERENCES public.reservas(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.shop_products(id) ON DELETE RESTRICT,
    variation_id UUID REFERENCES public.shop_product_variations(id) ON DELETE RESTRICT,
    product_name TEXT NOT NULL,
    variation_label TEXT, -- ex: "Cor: Preto, Tamanho: M"
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_shop_products_category ON public.shop_products(category_id);
CREATE INDEX idx_shop_products_active ON public.shop_products(is_active, show_in_checkout);
CREATE INDEX idx_shop_product_images_product ON public.shop_product_images(product_id);
CREATE INDEX idx_shop_product_variations_product ON public.shop_product_variations(product_id);
CREATE INDEX idx_shop_product_tours_product ON public.shop_product_tours(product_id);
CREATE INDEX idx_shop_product_tours_tour ON public.shop_product_tours(tour_id);
CREATE INDEX idx_shop_order_items_reserva ON public.shop_order_items(reserva_id);
CREATE INDEX idx_shop_order_items_product ON public.shop_order_items(product_id);

-- Triggers para updated_at
CREATE TRIGGER update_shop_categories_updated_at BEFORE UPDATE ON public.shop_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_shop_products_updated_at BEFORE UPDATE ON public.shop_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_shop_attributes_updated_at BEFORE UPDATE ON public.shop_attributes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_shop_product_variations_updated_at BEFORE UPDATE ON public.shop_product_variations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.shop_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_attribute_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_product_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_product_tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY;

-- Policies: Admins podem gerenciar tudo
CREATE POLICY "Admins can manage shop_categories" ON public.shop_categories FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage shop_products" ON public.shop_products FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage shop_product_images" ON public.shop_product_images FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage shop_attributes" ON public.shop_attributes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage shop_attribute_values" ON public.shop_attribute_values FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage shop_product_attributes" ON public.shop_product_attributes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage shop_product_variations" ON public.shop_product_variations FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage shop_product_tours" ON public.shop_product_tours FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage shop_order_items" ON public.shop_order_items FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Policies: Leitura pública para checkout
CREATE POLICY "Anyone can view active categories" ON public.shop_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view active products" ON public.shop_products FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view product images" ON public.shop_product_images FOR SELECT USING (true);
CREATE POLICY "Anyone can view attributes" ON public.shop_attributes FOR SELECT USING (true);
CREATE POLICY "Anyone can view attribute values" ON public.shop_attribute_values FOR SELECT USING (true);
CREATE POLICY "Anyone can view product attributes" ON public.shop_product_attributes FOR SELECT USING (true);
CREATE POLICY "Anyone can view active variations" ON public.shop_product_variations FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view product tours" ON public.shop_product_tours FOR SELECT USING (true);

-- Policy: Inserir itens de pedido durante checkout (qualquer pessoa pode criar pedido)
CREATE POLICY "Anyone can insert order items" ON public.shop_order_items FOR INSERT WITH CHECK (true);

-- Inserir categorias padrão
INSERT INTO public.shop_categories (name, slug, order_index) VALUES
    ('Vestuário', 'vestuario', 1),
    ('Equipamentos', 'equipamentos', 2),
    ('Alimentação', 'alimentacao', 3),
    ('Acessórios', 'acessorios', 4),
    ('Serviços', 'servicos', 5);

-- Inserir atributos padrão
INSERT INTO public.shop_attributes (name, slug, order_index) VALUES
    ('Tamanho', 'tamanho', 1),
    ('Cor', 'cor', 2),
    ('Numeração', 'numeracao', 3);

-- Inserir valores padrão para Tamanho
INSERT INTO public.shop_attribute_values (attribute_id, value, order_index)
SELECT id, unnest(ARRAY['PP', 'P', 'M', 'G', 'GG', 'XGG']), generate_series(1, 6)
FROM public.shop_attributes WHERE slug = 'tamanho';

-- Inserir valores padrão para Numeração
INSERT INTO public.shop_attribute_values (attribute_id, value, order_index)
SELECT id, unnest(ARRAY['34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44']), generate_series(1, 11)
FROM public.shop_attributes WHERE slug = 'numeracao';