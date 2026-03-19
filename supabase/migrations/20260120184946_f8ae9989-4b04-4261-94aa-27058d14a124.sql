
-- Fix Mikael's reservation - payment was confirmed but reservation expired before webhook arrived
UPDATE reservas 
SET 
  status = 'confirmada',
  payment_status = 'pago',
  updated_at = now()
WHERE id = '2554c2cd-c226-4bf5-9c94-ab84e875a7e2';
