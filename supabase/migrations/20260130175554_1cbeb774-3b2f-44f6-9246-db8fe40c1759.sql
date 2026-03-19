-- Fix the create_tickets_for_reservation function to prevent duplicate tickets
CREATE OR REPLACE FUNCTION public.create_tickets_for_reservation(p_reserva_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reserva RECORD;
    v_tour RECORD;
    v_boarding_point RECORD;
    v_participant RECORD;
    v_primary_client RECORD;
    v_cpf_normalized TEXT;
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
    
    -- Normalize CPF (remove dots and dashes) for comparison
    v_cpf_normalized := REGEXP_REPLACE(v_primary_client.cpf, '[^0-9]', '', 'g');
    
    -- Create ticket for primary participant only if:
    -- 1. No separate participants exist for this reservation, AND
    -- 2. No ticket already exists for this reservation + normalized CPF combination
    IF NOT EXISTS (SELECT 1 FROM reservation_participants WHERE reserva_id = p_reserva_id AND participant_index > 0) THEN
        -- Check if ticket already exists for this CPF in this reservation
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
                v_boarding_point.nome, v_boarding_point.endereco, NULL,
                v_tour.start_date, v_reserva.valor_pago, v_reserva.reserva_numero
            );
        END IF;
    END IF;
    
    -- Create tickets for each additional participant
    FOR v_participant IN 
        SELECT rp.*, tbp.nome as bp_nome, tbp.endereco as bp_endereco
        FROM reservation_participants rp
        LEFT JOIN tour_boarding_points tbp ON tbp.id = rp.ponto_embarque_id
        WHERE rp.reserva_id = p_reserva_id
    LOOP
        -- Normalize participant CPF
        v_cpf_normalized := REGEXP_REPLACE(COALESCE(v_participant.cpf, v_primary_client.cpf), '[^0-9]', '', 'g');
        
        -- Skip if ticket already exists for this participant_id OR for this CPF in this reservation
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
                COALESCE(v_participant.bp_nome, v_boarding_point.nome),
                COALESCE(v_participant.bp_endereco, v_boarding_point.endereco),
                NULL, v_tour.start_date, 
                v_reserva.valor_pago / GREATEST(v_reserva.numero_participantes, 1),
                v_reserva.reserva_numero
            );
        END IF;
    END LOOP;
END;
$$;