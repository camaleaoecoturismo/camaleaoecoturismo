-- Fix permissions for vw_reservas_completa view
-- Drop the existing view and recreate it with proper policies

DROP VIEW IF EXISTS vw_reservas_completa;

-- Recreate the view with security definer function approach
CREATE VIEW vw_reservas_completa AS
SELECT 
    r.id,
    r.reserva_numero,
    c.nome_completo,
    c.cpf,
    c.email,
    c.whatsapp as cliente_whatsapp,
    c.data_nascimento,
    t.name as tour_nome,
    t.city as tour_cidade,
    t.state as tour_estado,
    t.start_date as tour_data_inicio,
    t.end_date as tour_data_fim,
    tbp.nome as ponto_embarque_nome,
    tbp.endereco as ponto_embarque_endereco,
    r.status,
    r.payment_status,
    r.payment_method,
    r.data_reserva,
    r.data_confirmacao,
    r.data_pagamento,
    r.data_cancelamento,
    r.valor_passeio,
    r.valor_pago,
    r.valor_total_com_opcionais,
    r.numero_participantes,
    r.problema_saude,
    r.descricao_problema_saude,
    r.contato_emergencia_nome,
    r.contato_emergencia_telefone,
    r.opcionais,
    r.adicionais,
    r.observacoes,
    r.motivo_cancelamento,
    r.ticket_enviado,
    r.created_at,
    r.updated_at
FROM reservas r
JOIN clientes c ON r.cliente_id = c.id
JOIN tours t ON r.tour_id = t.id
JOIN tour_boarding_points tbp ON r.ponto_embarque_id = tbp.id;

-- Enable RLS on the view
ALTER VIEW vw_reservas_completa SET (security_barrier = true);

-- Create RLS policy for the view
CREATE POLICY "Admins can view complete reservations view" 
ON vw_reservas_completa 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));