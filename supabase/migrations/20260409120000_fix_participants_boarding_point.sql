-- Fix reservation_participants boarding point:
-- 1. Drop FK that restricts ponto_embarque_id to tour_boarding_points only
-- 2. Fix create_tickets_for_reservation to resolve names from both tables

-- Drop the legacy FK (allows storing pontos_embarque IDs too)
ALTER TABLE public.reservation_participants
DROP CONSTRAINT IF EXISTS reservation_participants_ponto_embarque_id_fkey;

-- Fix create_tickets_for_reservation to support both boarding point tables
CREATE OR REPLACE FUNCTION public.create_tickets_for_reservation(p_reserva_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reserva RECORD;
    v_tour RECORD;
    v_boarding_name TEXT;
    v_boarding_address TEXT;
    v_participant RECORD;
    v_primary_client RECORD;
    v_cpf_normalized TEXT;
    v_p_bp_name TEXT;
    v_p_bp_address TEXT;
BEGIN
    -- Get reservation details
    SELECT * INTO v_reserva FROM reservas WHERE id = p_reserva_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reservation not found';
    END IF;

    -- Get tour details
    SELECT * INTO v_tour FROM tours WHERE id = v_reserva.tour_id;

    -- Get boarding point details — try tour_boarding_points first, then pontos_embarque
    SELECT nome, endereco INTO v_boarding_name, v_boarding_address
    FROM tour_boarding_points WHERE id = v_reserva.ponto_embarque_id;

    IF v_boarding_name IS NULL AND v_reserva.ponto_embarque_id IS NOT NULL THEN
        SELECT nome, endereco INTO v_boarding_name, v_boarding_address
        FROM pontos_embarque WHERE id = v_reserva.ponto_embarque_id;
    END IF;

    -- Get primary client details
    SELECT * INTO v_primary_client FROM clientes WHERE id = v_reserva.cliente_id;

    -- Normalize CPF
    v_cpf_normalized := REGEXP_REPLACE(v_primary_client.cpf, '[^0-9]', '', 'g');

    -- Create ticket for primary participant only if no separate participants exist
    IF NOT EXISTS (SELECT 1 FROM reservation_participants WHERE reserva_id = p_reserva_id AND participant_index > 0) THEN
        IF NOT EXISTS (
            SELECT 1 FROM tickets
            WHERE reserva_id = p_reserva_id
            AND REGEXP_REPLACE(participant_cpf, '[^0-9]', '', 'g') = v_cpf_normalized
        ) THEN
            INSERT INTO tickets (
                reserva_id, tour_id, participant_name, participant_cpf,
                boarding_point_name, boarding_point_address, boarding_time,
                trip_date, amount_paid, reservation_number
            ) VALUES (
                p_reserva_id, v_reserva.tour_id, v_primary_client.nome_completo, v_cpf_normalized,
                v_boarding_name, v_boarding_address, NULL,
                v_tour.start_date, v_reserva.valor_pago, v_reserva.reserva_numero
            );
        END IF;
    END IF;

    -- Create tickets for each additional participant
    FOR v_participant IN
        SELECT rp.*
        FROM reservation_participants rp
        WHERE rp.reserva_id = p_reserva_id
    LOOP
        -- Resolve participant's boarding point — try tour_boarding_points then pontos_embarque
        v_p_bp_name := NULL;
        v_p_bp_address := NULL;

        IF v_participant.ponto_embarque_id IS NOT NULL THEN
            SELECT nome, endereco INTO v_p_bp_name, v_p_bp_address
            FROM tour_boarding_points WHERE id = v_participant.ponto_embarque_id;

            IF v_p_bp_name IS NULL THEN
                SELECT nome, endereco INTO v_p_bp_name, v_p_bp_address
                FROM pontos_embarque WHERE id = v_participant.ponto_embarque_id;
            END IF;
        END IF;

        -- Use participant's custom text if set
        IF v_p_bp_name IS NULL AND v_participant.ponto_embarque_personalizado IS NOT NULL THEN
            v_p_bp_name := v_participant.ponto_embarque_personalizado;
        END IF;

        -- Normalize participant CPF
        v_cpf_normalized := REGEXP_REPLACE(COALESCE(v_participant.cpf, v_primary_client.cpf), '[^0-9]', '', 'g');

        IF NOT EXISTS (SELECT 1 FROM tickets WHERE participant_id = v_participant.id)
           AND NOT EXISTS (
               SELECT 1 FROM tickets
               WHERE reserva_id = p_reserva_id
               AND REGEXP_REPLACE(participant_cpf, '[^0-9]', '', 'g') = v_cpf_normalized
           ) THEN
            INSERT INTO tickets (
                reserva_id, participant_id, tour_id, participant_name, participant_cpf,
                boarding_point_name, boarding_point_address, boarding_time,
                trip_date, amount_paid, reservation_number
            ) VALUES (
                p_reserva_id, v_participant.id, v_reserva.tour_id,
                COALESCE(v_participant.nome_completo, v_primary_client.nome_completo),
                v_cpf_normalized,
                COALESCE(v_p_bp_name, v_boarding_name),
                COALESCE(v_p_bp_address, v_boarding_address),
                NULL, v_tour.start_date,
                v_reserva.valor_pago / GREATEST(v_reserva.numero_participantes, 1),
                v_reserva.reserva_numero
            );
        END IF;
    END LOOP;
END;
$$;
