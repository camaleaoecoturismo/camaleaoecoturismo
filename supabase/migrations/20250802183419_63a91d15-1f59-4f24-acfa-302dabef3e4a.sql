-- 🔐 CORREÇÃO DOS PROBLEMAS DE SEGURANÇA
-- Corrigindo Function Search Path Mutable

-- 1. CORRIGIR FUNÇÃO generate_reserva_numero
CREATE OR REPLACE FUNCTION generate_reserva_numero()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.reserva_numero IS NULL THEN
        NEW.reserva_numero := 'RES' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('reserva_numero_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$;

-- 2. CORRIGIR FUNÇÃO validate_reserva_data
CREATE OR REPLACE FUNCTION validate_reserva_data()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Validar se tour existe
    IF NOT EXISTS (SELECT 1 FROM tours WHERE id = NEW.tour_id) THEN
        RAISE EXCEPTION 'Tour não encontrado: %', NEW.tour_id;
    END IF;
    
    -- Validar se cliente existe
    IF NOT EXISTS (SELECT 1 FROM clientes WHERE id = NEW.cliente_id) THEN
        RAISE EXCEPTION 'Cliente não encontrado: %', NEW.cliente_id;
    END IF;
    
    -- Validar se ponto de embarque pertence ao tour
    IF NOT EXISTS (
        SELECT 1 FROM tour_boarding_points 
        WHERE id = NEW.ponto_embarque_id AND tour_id = NEW.tour_id
    ) THEN
        RAISE EXCEPTION 'Ponto de embarque inválido para este tour';
    END IF;
    
    -- Validar valores monetários (se não forem nulos)
    IF (NEW.valor_passeio IS NOT NULL AND NEW.valor_passeio < 0) 
       OR (NEW.valor_pago IS NOT NULL AND NEW.valor_pago < 0) 
       OR (NEW.valor_total_com_opcionais IS NOT NULL AND NEW.valor_total_com_opcionais < 0) THEN
        RAISE EXCEPTION 'Valores monetários não podem ser negativos';
    END IF;
    
    RETURN NEW;
END;
$$;

-- 3. CORRIGIR FUNÇÃO update_reserva_timestamps
CREATE OR REPLACE FUNCTION update_reserva_timestamps()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Atualizar timestamp de confirmação
    IF OLD.status != 'confirmada' AND NEW.status = 'confirmada' AND NEW.data_confirmacao IS NULL THEN
        NEW.data_confirmacao := NOW();
    END IF;
    
    -- Atualizar timestamp de cancelamento
    IF OLD.status != 'cancelada' AND NEW.status = 'cancelada' AND NEW.data_cancelamento IS NULL THEN
        NEW.data_cancelamento := NOW();
    END IF;
    
    -- Atualizar timestamp de pagamento
    IF OLD.payment_status != 'pago' AND NEW.payment_status = 'pago' AND NEW.data_pagamento IS NULL THEN
        NEW.data_pagamento := NOW();
    END IF;
    
    RETURN NEW;
END;
$$;