
-- Create table for global question templates
CREATE TABLE public.form_question_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    field_type TEXT NOT NULL DEFAULT 'text',
    is_required BOOLEAN NOT NULL DEFAULT false,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    allow_tour_edit BOOLEAN NOT NULL DEFAULT true,
    options JSONB DEFAULT '[]'::jsonb,
    standard_field_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for question edit history
CREATE TABLE public.form_question_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.form_question_templates(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES auth.users(id),
    old_values JSONB,
    new_values JSONB,
    change_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add reference to template in tour_custom_questions
ALTER TABLE public.tour_custom_questions 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.form_question_templates(id);

-- Enable RLS
ALTER TABLE public.form_question_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_question_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for form_question_templates
CREATE POLICY "Anyone can view active templates"
ON public.form_question_templates
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage templates"
ON public.form_question_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for form_question_history
CREATE POLICY "Admins can view history"
ON public.form_question_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert history"
ON public.form_question_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_form_question_templates_updated_at
BEFORE UPDATE ON public.form_question_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing standard questions to templates
INSERT INTO public.form_question_templates (title, description, field_type, is_required, order_index, is_active, allow_tour_edit, standard_field_key, options)
VALUES
    ('Informe seu CPF:', NULL, 'cpf', true, 1, true, false, 'cpf', '[]'),
    ('Qual seu nome completo?', NULL, 'text', true, 2, true, false, 'nome_completo', '[]'),
    ('Qual seu WhatsApp?', NULL, 'phone', true, 3, true, false, 'whatsapp', '[]'),
    ('Qual sua data de nascimento?', NULL, 'date', true, 4, true, false, 'data_nascimento', '[]'),
    ('Qual seu e-mail?', NULL, 'email', true, 5, true, false, 'email', '[]'),
    ('Quantas vagas deseja reservar?', NULL, 'number', true, 6, true, false, 'numero_participantes', '[]'),
    ('Escolha seu ponto de embarque:', NULL, 'select', true, 7, true, false, 'ponto_embarque_id', '[]'),
    ('Qual o nível de condicionamento físico atual?', NULL, 'radio', true, 8, true, true, 'nivel_condicionamento', '[{"label": "SEDENTÁRIO(A) - só de ir do quarto pra sala já perco o fôlego", "value": "sedentario"}, {"label": "INICIANTE - encaro caminhadas ou trilhas leves", "value": "iniciante"}, {"label": "INTERMEDIÁRIO - gosto de caminhar por alguns quilômetros", "value": "intermediario"}, {"label": "AVANÇADO - pratico atividade física regularmente (pelo menos 3x semana)", "value": "avancado"}, {"label": "ATLETA - amo um desafio físico", "value": "atleta"}]'),
    ('Existe alguma condição de saúde, alergia ou uso de medicamentos que possa impactar sua participação?', NULL, 'boolean', true, 9, true, true, 'problema_saude', '[]'),
    ('Descreva seu problema de saúde', 'Aparece apenas se responder sim na pergunta anterior', 'textarea', false, 10, true, true, 'descricao_problema_saude', '[]'),
    ('Informe um contato de emergência (opcional)', NULL, 'emergency_contact', false, 11, true, true, 'contato_emergencia', '[]'),
    ('Precisa de alguma assistência diferenciada que devemos saber?', NULL, 'boolean', false, 12, true, true, 'assistencia_diferenciada', '[]'),
    ('Descreva a assistência diferenciada que você precisa', 'Aparece apenas se responder sim na pergunta anterior', 'textarea', false, 13, true, true, 'descricao_assistencia_diferenciada', '[]'),
    ('Você concorda com os Termos e Condições de Participação da Camaleão Ecoturismo?', NULL, 'policy_accept', true, 99, true, false, 'aceita_politica', '[]'),
    ('Você concorda com a Política de Cancelamento e Alteração da Camaleão Ecoturismo?', NULL, 'policy_accept', true, 100, true, false, 'aceita_cancelamento', '[]');

-- Create index for faster lookups
CREATE INDEX idx_form_question_templates_active ON public.form_question_templates(is_active);
CREATE INDEX idx_form_question_templates_standard_key ON public.form_question_templates(standard_field_key);
CREATE INDEX idx_tour_custom_questions_template ON public.tour_custom_questions(template_id);
