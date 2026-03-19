-- Tickets table for individual participant tickets
CREATE TABLE public.tickets (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    reserva_id UUID NOT NULL REFERENCES public.reservas(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES public.reservation_participants(id) ON DELETE CASCADE,
    tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
    qr_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    ticket_number TEXT NOT NULL,
    participant_name TEXT NOT NULL,
    participant_cpf TEXT,
    boarding_point_name TEXT,
    boarding_point_address TEXT,
    boarding_time TEXT,
    trip_date DATE NOT NULL,
    amount_paid NUMERIC,
    reservation_number TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'cancelled', 'invalid')),
    checkin_at TIMESTAMP WITH TIME ZONE,
    checkin_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ticket templates table
CREATE TABLE public.ticket_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tour_id UUID REFERENCES public.tours(id) ON DELETE CASCADE,
    is_default BOOLEAN NOT NULL DEFAULT false,
    name TEXT NOT NULL,
    cover_image_url TEXT,
    logo_url TEXT,
    background_color TEXT DEFAULT '#7C12D1',
    text_color TEXT DEFAULT '#FFFFFF',
    accent_color TEXT DEFAULT '#FFD700',
    title_text TEXT DEFAULT '{{nome_passeio}}',
    subtitle_text TEXT DEFAULT 'Ingresso Individual',
    rules_text TEXT DEFAULT 'ATENÇÃO: Chegue com 15 minutos de antecedência ao ponto de embarque. Tolerância máxima de 10 minutos para saída do ônibus. Não nos responsabilizamos por atrasos.',
    footer_text TEXT DEFAULT 'Este ingresso é pessoal e intransferível. Apresente-o no embarque.',
    show_qr_label BOOLEAN DEFAULT true,
    qr_label_text TEXT DEFAULT 'Apresente este QR Code no embarque',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START WITH 1;

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ticket_number := 'TKT' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('ticket_number_seq')::TEXT, 5, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for ticket number generation
CREATE TRIGGER generate_ticket_number_trigger
    BEFORE INSERT ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_ticket_number();

-- Function to create tickets for a reservation
CREATE OR REPLACE FUNCTION public.create_tickets_for_reservation(p_reserva_id UUID)
RETURNS VOID AS $$
DECLARE
    v_reserva RECORD;
    v_tour RECORD;
    v_boarding_point RECORD;
    v_participant RECORD;
    v_primary_client RECORD;
BEGIN
    -- Get reservation details
    SELECT * INTO v_reserva FROM reservas WHERE id = p_reserva_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reservation not found';
    END IF;
    
    -- Get tour details
    SELECT * INTO v_tour FROM tours WHERE id = v_reserva.tour_id;
    
    -- Get boarding point details
    SELECT * INTO v_boarding_point FROM tour_boarding_points WHERE id = v_reserva.ponto_embarque_id;
    
    -- Get primary client details
    SELECT * INTO v_primary_client FROM clientes WHERE id = v_reserva.cliente_id;
    
    -- Create ticket for primary participant (if no separate participants exist)
    IF NOT EXISTS (SELECT 1 FROM reservation_participants WHERE reserva_id = p_reserva_id AND participant_index > 0) THEN
        INSERT INTO tickets (
            reserva_id, tour_id, participant_name, participant_cpf,
            boarding_point_name, boarding_point_address, boarding_time,
            trip_date, amount_paid, reservation_number
        ) VALUES (
            p_reserva_id, v_reserva.tour_id, v_primary_client.nome_completo, v_primary_client.cpf,
            v_boarding_point.nome, v_boarding_point.endereco, NULL,
            v_tour.start_date, v_reserva.valor_pago, v_reserva.reserva_numero
        );
    END IF;
    
    -- Create tickets for each additional participant
    FOR v_participant IN 
        SELECT rp.*, tbp.nome as bp_nome, tbp.endereco as bp_endereco
        FROM reservation_participants rp
        LEFT JOIN tour_boarding_points tbp ON tbp.id = rp.ponto_embarque_id
        WHERE rp.reserva_id = p_reserva_id
    LOOP
        -- Skip if ticket already exists for this participant
        IF NOT EXISTS (SELECT 1 FROM tickets WHERE participant_id = v_participant.id) THEN
            INSERT INTO tickets (
                reserva_id, participant_id, tour_id, participant_name, participant_cpf,
                boarding_point_name, boarding_point_address, boarding_time,
                trip_date, amount_paid, reservation_number
            ) VALUES (
                p_reserva_id, v_participant.id, v_reserva.tour_id, 
                COALESCE(v_participant.nome_completo, v_primary_client.nome_completo),
                COALESCE(v_participant.cpf, v_primary_client.cpf),
                COALESCE(v_participant.bp_nome, v_boarding_point.nome),
                COALESCE(v_participant.bp_endereco, v_boarding_point.endereco),
                NULL, v_tour.start_date, 
                v_reserva.valor_pago / GREATEST(v_reserva.numero_participantes, 1),
                v_reserva.reserva_numero
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tickets
CREATE POLICY "Admins can manage tickets" ON public.tickets
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view tickets by qr_token" ON public.tickets
    FOR SELECT USING (true);

-- RLS Policies for ticket_templates
CREATE POLICY "Admins can manage ticket templates" ON public.ticket_templates
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view ticket templates" ON public.ticket_templates
    FOR SELECT USING (true);

-- Create default ticket template
INSERT INTO public.ticket_templates (is_default, name, rules_text)
VALUES (
    true,
    'Template Padrão Camaleão',
    'ATENÇÃO:
• Chegue com 15 minutos de antecedência ao ponto de embarque
• Tolerância máxima de 10 minutos para saída do ônibus
• Não nos responsabilizamos por atrasos
• Leve documento com foto
• Use roupas e calçados confortáveis
• Leve protetor solar e repelente
• Não é permitido o consumo de bebidas alcoólicas durante o trajeto'
);

-- Indexes for performance
CREATE INDEX idx_tickets_reserva_id ON public.tickets(reserva_id);
CREATE INDEX idx_tickets_tour_id ON public.tickets(tour_id);
CREATE INDEX idx_tickets_qr_token ON public.tickets(qr_token);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_ticket_templates_tour_id ON public.ticket_templates(tour_id);