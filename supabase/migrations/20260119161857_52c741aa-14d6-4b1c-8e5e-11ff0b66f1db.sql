-- Corrigir a reserva da Maria Ingrid que foi paga via InfinitePay mas ficou como expirada
-- O webhook confirmou o pagamento (há log infinitepay_webhook_approved) mas a reserva não foi atualizada
UPDATE reservas 
SET 
  status = 'confirmada', 
  payment_status = 'pago'
WHERE id = '931088b0-eeaa-4aaa-88c4-a3e51ac85c52'
  AND status = 'expirada';