-- =============================================
-- SISTEMA DE MAPA DE ASSENTOS / TRANSPORTE
-- =============================================

-- 1. Tabela de veículos/transportes
CREATE TABLE public.transport_vehicles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL, -- Ex: "Ônibus 46L", "Van 15L"
    description TEXT,
    total_capacity INTEGER NOT NULL DEFAULT 0,
    rows_count INTEGER NOT NULL DEFAULT 10,
    seats_per_row INTEGER NOT NULL DEFAULT 4, -- Ex: 4 para 2x2
    aisle_position INTEGER NOT NULL DEFAULT 2, -- Posição do corredor (após qual assento)
    layout_config JSONB DEFAULT '{}', -- Configurações extras do layout
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Tabela de assentos individuais de cada veículo
CREATE TABLE public.vehicle_seats (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID NOT NULL REFERENCES public.transport_vehicles(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL, -- Número da fileira (1, 2, 3...)
    seat_letter TEXT NOT NULL, -- Letra do assento (A, B, C, D...)
    seat_label TEXT NOT NULL, -- Rótulo completo (1A, 1B, 2A...)
    seat_type TEXT NOT NULL DEFAULT 'standard', -- standard, preferential, crew, blocked
    position_x INTEGER NOT NULL DEFAULT 0, -- Posição X no grid visual
    position_y INTEGER NOT NULL DEFAULT 0, -- Posição Y no grid visual
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(vehicle_id, seat_label)
);

-- 3. Configuração de transporte por passeio
CREATE TABLE public.tour_transport_config (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.transport_vehicles(id) ON DELETE CASCADE,
    vehicle_order INTEGER NOT NULL DEFAULT 1, -- Ordem do veículo (se houver múltiplos)
    seat_selection_enabled BOOLEAN NOT NULL DEFAULT false, -- Ativar seleção de assentos
    auto_assign_seats BOOLEAN NOT NULL DEFAULT true, -- Alocar automaticamente se cliente não escolher
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(tour_id, vehicle_id, vehicle_order)
);

-- 4. Alocação de assentos por participante
CREATE TABLE public.participant_seat_assignments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
    transport_config_id UUID NOT NULL REFERENCES public.tour_transport_config(id) ON DELETE CASCADE,
    seat_id UUID NOT NULL REFERENCES public.vehicle_seats(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES public.reservation_participants(id) ON DELETE SET NULL,
    reserva_id UUID REFERENCES public.reservas(id) ON DELETE SET NULL,
    assignment_type TEXT NOT NULL DEFAULT 'participant', -- participant, crew, blocked
    assigned_by UUID, -- Admin que fez a alocação manual
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(transport_config_id, seat_id) -- Um assento só pode ter uma alocação por config
);

-- Índices para performance
CREATE INDEX idx_vehicle_seats_vehicle ON public.vehicle_seats(vehicle_id);
CREATE INDEX idx_tour_transport_config_tour ON public.tour_transport_config(tour_id);
CREATE INDEX idx_participant_seat_assignments_tour ON public.participant_seat_assignments(tour_id);
CREATE INDEX idx_participant_seat_assignments_participant ON public.participant_seat_assignments(participant_id);
CREATE INDEX idx_participant_seat_assignments_seat ON public.participant_seat_assignments(seat_id);

-- Triggers para updated_at
CREATE TRIGGER update_transport_vehicles_updated_at
    BEFORE UPDATE ON public.transport_vehicles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tour_transport_config_updated_at
    BEFORE UPDATE ON public.tour_transport_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_participant_seat_assignments_updated_at
    BEFORE UPDATE ON public.participant_seat_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.transport_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_transport_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_seat_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies para transport_vehicles
CREATE POLICY "Admins can manage transport vehicles"
    ON public.transport_vehicles FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active transport vehicles"
    ON public.transport_vehicles FOR SELECT
    USING (is_active = true);

-- RLS Policies para vehicle_seats
CREATE POLICY "Admins can manage vehicle seats"
    ON public.vehicle_seats FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active vehicle seats"
    ON public.vehicle_seats FOR SELECT
    USING (is_active = true);

-- RLS Policies para tour_transport_config
CREATE POLICY "Admins can manage tour transport config"
    ON public.tour_transport_config FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view tour transport config"
    ON public.tour_transport_config FOR SELECT
    USING (true);

-- RLS Policies para participant_seat_assignments
CREATE POLICY "Admins can manage seat assignments"
    ON public.participant_seat_assignments FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view seat assignments"
    ON public.participant_seat_assignments FOR SELECT
    USING (true);

CREATE POLICY "Anyone can create seat assignments during booking"
    ON public.participant_seat_assignments FOR INSERT
    WITH CHECK (true);

-- Função para gerar assentos automaticamente ao criar veículo
CREATE OR REPLACE FUNCTION public.generate_vehicle_seats(
    p_vehicle_id UUID,
    p_rows INTEGER,
    p_seats_per_row INTEGER,
    p_aisle_position INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_row INTEGER;
    v_seat INTEGER;
    v_letter TEXT;
    v_pos_x INTEGER;
    v_pos_y INTEGER;
    v_letters TEXT[] := ARRAY['A', 'B', 'C', 'D', 'E', 'F'];
BEGIN
    -- Limpar assentos existentes
    DELETE FROM vehicle_seats WHERE vehicle_id = p_vehicle_id;
    
    FOR v_row IN 1..p_rows LOOP
        v_pos_x := 0;
        FOR v_seat IN 1..p_seats_per_row LOOP
            v_letter := v_letters[v_seat];
            
            -- Ajustar posição X considerando corredor
            IF v_seat > p_aisle_position THEN
                v_pos_x := v_seat; -- Pula uma posição para o corredor
            ELSE
                v_pos_x := v_seat - 1;
            END IF;
            
            v_pos_y := v_row - 1;
            
            INSERT INTO vehicle_seats (
                vehicle_id, row_number, seat_letter, seat_label, 
                position_x, position_y, seat_type
            ) VALUES (
                p_vehicle_id, v_row, v_letter, v_row || v_letter,
                v_pos_x, v_pos_y, 'standard'
            );
        END LOOP;
    END LOOP;
    
    -- Atualizar capacidade total
    UPDATE transport_vehicles 
    SET total_capacity = p_rows * p_seats_per_row
    WHERE id = p_vehicle_id;
END;
$$;

-- Função para liberar assentos quando reserva é cancelada
CREATE OR REPLACE FUNCTION public.release_seats_on_cancellation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NEW.status = 'cancelada' AND OLD.status != 'cancelada' THEN
        DELETE FROM participant_seat_assignments 
        WHERE reserva_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER release_seats_on_reservation_cancel
    AFTER UPDATE ON public.reservas
    FOR EACH ROW
    EXECUTE FUNCTION public.release_seats_on_cancellation();

-- Função para obter assentos disponíveis de um passeio
CREATE OR REPLACE FUNCTION public.get_available_seats(p_tour_id UUID)
RETURNS TABLE (
    seat_id UUID,
    seat_label TEXT,
    seat_type TEXT,
    row_number INTEGER,
    seat_letter TEXT,
    position_x INTEGER,
    position_y INTEGER,
    vehicle_id UUID,
    vehicle_name TEXT,
    is_occupied BOOLEAN,
    occupant_name TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vs.id as seat_id,
        vs.seat_label,
        vs.seat_type,
        vs.row_number,
        vs.seat_letter,
        vs.position_x,
        vs.position_y,
        tv.id as vehicle_id,
        tv.name as vehicle_name,
        (psa.id IS NOT NULL) as is_occupied,
        COALESCE(rp.nome_completo, c.nome_completo) as occupant_name
    FROM tour_transport_config ttc
    JOIN transport_vehicles tv ON tv.id = ttc.vehicle_id
    JOIN vehicle_seats vs ON vs.vehicle_id = tv.id AND vs.is_active = true
    LEFT JOIN participant_seat_assignments psa ON psa.seat_id = vs.id AND psa.transport_config_id = ttc.id
    LEFT JOIN reservation_participants rp ON rp.id = psa.participant_id
    LEFT JOIN reservas r ON r.id = psa.reserva_id
    LEFT JOIN clientes c ON c.id = r.cliente_id
    WHERE ttc.tour_id = p_tour_id
    ORDER BY tv.id, vs.row_number, vs.seat_letter;
END;
$$;