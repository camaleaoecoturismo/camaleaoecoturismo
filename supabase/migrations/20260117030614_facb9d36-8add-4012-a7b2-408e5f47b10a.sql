-- Content Planning System for Instagram

-- Table for content ideas (backlog)
CREATE TABLE public.content_ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tema TEXT NOT NULL,
  gancho TEXT,
  formato TEXT NOT NULL CHECK (formato IN ('reels', 'feed', 'carrossel', 'stories')),
  objetivo TEXT NOT NULL CHECK (objetivo IN ('venda', 'engajamento', 'autoridade', 'relacionamento', 'institucional')),
  tags TEXT[] DEFAULT '{}',
  prioridade TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta')),
  status TEXT NOT NULL DEFAULT 'nova' CHECK (status IN ('nova', 'interessante', 'pronta', 'arquivada')),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for planned posts (calendar items)
CREATE TABLE public.content_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id UUID REFERENCES public.content_ideas(id) ON DELETE SET NULL,
  data_publicacao DATE,
  horario TIME,
  plataforma TEXT NOT NULL DEFAULT 'instagram',
  formato TEXT NOT NULL CHECK (formato IN ('reels', 'feed', 'carrossel', 'stories')),
  tema TEXT NOT NULL,
  legenda TEXT,
  hashtags TEXT[],
  midia_url TEXT,
  midia_referencia TEXT,
  objetivo TEXT NOT NULL CHECK (objetivo IN ('venda', 'engajamento', 'autoridade', 'relacionamento', 'institucional')),
  campanha TEXT,
  status TEXT NOT NULL DEFAULT 'ideia' CHECK (status IN ('ideia', 'em_producao', 'aprovado', 'agendado', 'publicado')),
  tour_id UUID REFERENCES public.tours(id) ON DELETE SET NULL,
  notas TEXT,
  ordem_dia INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for AI suggestions history
CREATE TABLE public.content_ai_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  sugestao_formato TEXT,
  sugestao_tema TEXT,
  data_sugerida DATE,
  acao_tomada TEXT CHECK (acao_tomada IN ('criar_post', 'criar_ideia', 'ignorar')),
  post_criado_id UUID REFERENCES public.content_posts(id) ON DELETE SET NULL,
  ideia_criada_id UUID REFERENCES public.content_ideas(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolvida BOOLEAN DEFAULT false
);

-- Table for content campaigns
CREATE TABLE public.content_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  data_inicio DATE,
  data_fim DATE,
  cor TEXT DEFAULT '#10B981',
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add campaign reference to posts
ALTER TABLE public.content_posts 
ADD COLUMN campanha_id UUID REFERENCES public.content_campaigns(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.content_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin only - authenticated users)
CREATE POLICY "Authenticated users can manage content_ideas" 
ON public.content_ideas FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage content_posts" 
ON public.content_posts FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage content_ai_suggestions" 
ON public.content_ai_suggestions FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage content_campaigns" 
ON public.content_campaigns FOR ALL USING (auth.role() = 'authenticated');

-- Trigger for updated_at
CREATE TRIGGER update_content_ideas_updated_at
BEFORE UPDATE ON public.content_ideas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_posts_updated_at
BEFORE UPDATE ON public.content_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_campaigns_updated_at
BEFORE UPDATE ON public.content_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_content_ideas_status ON public.content_ideas(status);
CREATE INDEX idx_content_ideas_formato ON public.content_ideas(formato);
CREATE INDEX idx_content_ideas_prioridade ON public.content_ideas(prioridade);
CREATE INDEX idx_content_posts_data ON public.content_posts(data_publicacao);
CREATE INDEX idx_content_posts_status ON public.content_posts(status);
CREATE INDEX idx_content_posts_formato ON public.content_posts(formato);
CREATE INDEX idx_content_posts_campanha ON public.content_posts(campanha_id);