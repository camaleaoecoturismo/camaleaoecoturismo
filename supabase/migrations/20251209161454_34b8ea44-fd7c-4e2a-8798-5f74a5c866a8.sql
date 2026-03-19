-- Adicionar coluna de vagas totais nos tours
ALTER TABLE tours ADD COLUMN IF NOT EXISTS vagas INTEGER DEFAULT NULL;

-- Adicionar colunas para membros da equipe nos participantes
ALTER TABLE reservation_participants 
ADD COLUMN IF NOT EXISTS is_staff BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS staff_role TEXT DEFAULT NULL;

-- Função para contar vagas ocupadas (participantes confirmados + equipe)
CREATE OR REPLACE FUNCTION get_tour_occupied_spots(p_tour_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_spots INTEGER := 0;
BEGIN
    -- Contar participantes de reservas confirmadas/pagas
    SELECT COALESCE(SUM(r.numero_participantes), 0)
    INTO total_spots
    FROM reservas r
    WHERE r.tour_id = p_tour_id
      AND r.status IN ('confirmada', 'confirmado')
      AND r.payment_status = 'pago';
    
    -- Adicionar membros da equipe (staff)
    total_spots := total_spots + (
        SELECT COUNT(*)
        FROM reservation_participants rp
        JOIN reservas r ON r.id = rp.reserva_id
        WHERE r.tour_id = p_tour_id
          AND rp.is_staff = TRUE
    );
    
    RETURN total_spots;
END;
$$;

-- Função para verificar disponibilidade de vagas
-- Retorna TRUE se há vagas disponíveis, FALSE se não há
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
    v_vagas_ocupadas INTEGER;
BEGIN
    -- Buscar informações do tour
    SELECT etiqueta, vagas
    INTO v_etiqueta, v_vagas_total
    FROM tours
    WHERE id = p_tour_id;
    
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