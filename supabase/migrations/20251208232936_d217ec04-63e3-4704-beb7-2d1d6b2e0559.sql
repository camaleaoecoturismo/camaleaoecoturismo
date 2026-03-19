-- Create table for additional participants (quando uma reserva tem mais de 1 vaga)
CREATE TABLE public.reservation_participants (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    reserva_id UUID NOT NULL REFERENCES public.reservas(id) ON DELETE CASCADE,
    participant_index INTEGER NOT NULL DEFAULT 1, -- 1 = titular, 2+ = adicionais
    nome_completo TEXT,
    cpf TEXT,
    data_nascimento DATE,
    whatsapp TEXT,
    email TEXT,
    problema_saude BOOLEAN DEFAULT false,
    descricao_problema_saude TEXT,
    contato_emergencia_nome TEXT,
    contato_emergencia_telefone TEXT,
    nivel_condicionamento TEXT,
    assistencia_diferenciada BOOLEAN DEFAULT false,
    descricao_assistencia_diferenciada TEXT,
    ticket_enviado BOOLEAN DEFAULT false,
    observacoes TEXT,
    data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    UNIQUE(reserva_id, participant_index)
);

-- Enable RLS
ALTER TABLE public.reservation_participants ENABLE ROW LEVEL SECURITY;

-- Admin can manage all
CREATE POLICY "Admins can manage reservation participants" 
ON public.reservation_participants 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view (for public reservation tracking)
CREATE POLICY "Anyone can view reservation participants" 
ON public.reservation_participants 
FOR SELECT 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_reservation_participants_updated_at
    BEFORE UPDATE ON public.reservation_participants
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_reservation_participants_reserva_id ON public.reservation_participants(reserva_id);
CREATE INDEX idx_reservation_participants_cpf ON public.reservation_participants(cpf) WHERE cpf IS NOT NULL;