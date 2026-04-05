-- Fix validate_reserva_data trigger to:
-- 1. Skip boarding point validation when ponto_embarque_id is NULL
-- 2. Accept boarding points from both tour_boarding_points (legacy) and pontos_embarque (global) tables

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

    -- Validar ponto de embarque apenas se informado
    IF NEW.ponto_embarque_id IS NOT NULL THEN
        IF NOT EXISTS (
            -- Legacy: tour_boarding_points per-tour
            SELECT 1 FROM tour_boarding_points
            WHERE id = NEW.ponto_embarque_id AND tour_id = NEW.tour_id
        ) AND NOT EXISTS (
            -- Global: pontos_embarque linked via tour_pontos_embarque
            SELECT 1 FROM tour_pontos_embarque tpe
            WHERE tpe.tour_id = NEW.tour_id
              AND tpe.ponto_embarque_id = NEW.ponto_embarque_id
        ) THEN
            RAISE EXCEPTION 'Ponto de embarque inválido para este tour';
        END IF;
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
