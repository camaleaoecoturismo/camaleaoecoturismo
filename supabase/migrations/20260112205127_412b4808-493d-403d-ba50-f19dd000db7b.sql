-- Allow reservas.ponto_embarque_id to be NULL when user selects "Outro local" (custom boarding)
-- This fixes the validation error: "Ponto de embarque inválido para este tour"

CREATE OR REPLACE FUNCTION public.validate_reserva_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

  -- Validar ponto de embarque SOMENTE quando informado
  -- (quando o cliente escolhe "Outro local", o frontend envia NULL)
  IF NEW.ponto_embarque_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM tour_boarding_points
    WHERE id = NEW.ponto_embarque_id
      AND tour_id = NEW.tour_id
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