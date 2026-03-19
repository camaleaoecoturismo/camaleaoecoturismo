-- Criar tabela para perguntas customizadas dos tours
CREATE TABLE public.tour_custom_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'textarea', 'select', 'boolean'
  options TEXT[], -- Para perguntas tipo select
  is_required BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para armazenar respostas das perguntas customizadas
CREATE TABLE public.reservation_custom_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reserva_id UUID NOT NULL REFERENCES reservas(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES tour_custom_questions(id) ON DELETE CASCADE,
  answer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reserva_id, question_id)
);

-- Enable RLS
ALTER TABLE public.tour_custom_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_custom_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies para tour_custom_questions
CREATE POLICY "Anyone can view tour custom questions" 
ON public.tour_custom_questions 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage tour custom questions" 
ON public.tour_custom_questions 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- RLS Policies para reservation_custom_answers  
CREATE POLICY "Anyone can insert reservation answers" 
ON public.reservation_custom_answers 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can view all reservation answers" 
ON public.reservation_custom_answers 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update reservation answers" 
ON public.reservation_custom_answers 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Triggers para updated_at
CREATE TRIGGER update_tour_custom_questions_updated_at
BEFORE UPDATE ON public.tour_custom_questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes para performance
CREATE INDEX idx_tour_custom_questions_tour_id ON public.tour_custom_questions(tour_id);
CREATE INDEX idx_tour_custom_questions_order ON public.tour_custom_questions(tour_id, order_index);
CREATE INDEX idx_reservation_custom_answers_reserva_id ON public.reservation_custom_answers(reserva_id);
CREATE INDEX idx_reservation_custom_answers_question_id ON public.reservation_custom_answers(question_id);