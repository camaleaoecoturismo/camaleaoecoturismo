-- Criar tabela de clientes
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cpf TEXT NOT NULL UNIQUE,
  nome_completo TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  data_nascimento DATE NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de pontos de embarque
CREATE TABLE public.pontos_embarque (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  endereco TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de reservas
CREATE TABLE public.reservas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  ponto_embarque_id UUID NOT NULL REFERENCES public.pontos_embarque(id),
  problema_saude BOOLEAN NOT NULL DEFAULT false,
  descricao_problema_saude TEXT,
  contato_emergencia_nome TEXT NOT NULL,
  contato_emergencia_telefone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  data_reserva TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar campo link_pagamento na tabela tours
ALTER TABLE public.tours ADD COLUMN link_pagamento TEXT;

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pontos_embarque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;

-- Políticas para clientes (público pode inserir, mas só visualizar próprios dados)
CREATE POLICY "Qualquer um pode inserir clientes" 
ON public.clientes 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem ver todos os clientes" 
ON public.clientes 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar clientes" 
ON public.clientes 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Políticas para pontos de embarque (público pode visualizar, apenas autenticados podem modificar)
CREATE POLICY "Todos podem ver pontos de embarque ativos" 
ON public.pontos_embarque 
FOR SELECT 
USING (ativo = true);

CREATE POLICY "Usuários autenticados podem gerenciar pontos de embarque" 
ON public.pontos_embarque 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Políticas para reservas (público pode inserir, apenas autenticados podem ver todas)
CREATE POLICY "Qualquer um pode criar reservas" 
ON public.reservas 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem ver todas as reservas" 
ON public.reservas 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar reservas" 
ON public.reservas 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_clientes_updated_at
BEFORE UPDATE ON public.clientes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reservas_updated_at
BEFORE UPDATE ON public.reservas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir alguns pontos de embarque padrão
INSERT INTO public.pontos_embarque (nome, endereco) VALUES
('Terminal Rodoviário de Maceió', 'Av. Leste Oeste, s/n - Feitosa, Maceió - AL'),
('Praça da Faculdade (UFAL)', 'Campus A. C. Simões, Maceió - AL'),
('Shopping Maceió', 'Av. Comendador Gustavo Paiva, 5945 - Mangabeiras, Maceió - AL'),
('Pajuçara', 'Orla de Pajuçara, Maceió - AL');