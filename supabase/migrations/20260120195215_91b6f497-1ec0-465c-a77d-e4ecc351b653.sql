-- Atualizar get_tour_occupied_spots para usar a mesma lógica de get_available_spots
CREATE OR REPLACE FUNCTION get_tour_occupied_spots(p_tour_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_spots INTEGER := 0;
    staff_count INTEGER := 0;
BEGIN
    -- Contar participantes de reservas confirmadas/pagas (mesma lógica de get_available_spots)
    SELECT COALESCE(SUM(r.numero_participantes), 0)
    INTO total_spots
    FROM reservas r
    WHERE r.tour_id = p_tour_id
      AND r.status IN ('confirmada', 'confirmado')
      AND r.payment_status IN ('confirmed', 'pago');
    
    -- Adicionar membros da equipe (staff)
    SELECT COUNT(*)
    INTO staff_count
    FROM reservation_participants rp
    INNER JOIN reservas r ON r.id = rp.reserva_id
    WHERE r.tour_id = p_tour_id
      AND rp.is_staff = TRUE;
    
    RETURN total_spots + staff_count;
END;
$$;

-- Atualizar check_tour_availability para verificar vagas_fechadas também
CREATE OR REPLACE FUNCTION check_tour_availability(p_tour_id UUID, p_requested_spots INTEGER DEFAULT 1)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_etiqueta TEXT;
    v_vagas_total INTEGER;
    v_vagas_fechadas BOOLEAN;
    v_vagas_ocupadas INTEGER;
BEGIN
    -- Buscar informações do tour
    SELECT etiqueta, vagas, vagas_fechadas
    INTO v_etiqueta, v_vagas_total, v_vagas_fechadas
    FROM tours
    WHERE id = p_tour_id;
    
    -- Verificar bloqueio por vagas_fechadas
    IF v_vagas_fechadas = TRUE THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar bloqueio por etiqueta manual
    IF v_etiqueta = 'Vagas encerradas' THEN
        RETURN FALSE;
    END IF;
    
    -- Se não há limite de vagas definido, sempre disponível
    IF v_vagas_total IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Contar vagas ocupadas
    v_vagas_ocupadas := get_tour_occupied_spots(p_tour_id);
    
    -- Verificar se há espaço para os spots solicitados
    RETURN (v_vagas_ocupadas + p_requested_spots) <= v_vagas_total;
END;
$$;