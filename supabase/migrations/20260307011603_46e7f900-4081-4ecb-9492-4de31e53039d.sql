-- Fix the specific reservation that had optionals not saved correctly
UPDATE reservas 
SET valor_total_com_opcionais = 310, 
    valor_pago = 310, 
    selected_optional_items = '[{"id":"a02fcca8-cbc5-45a7-8a22-e803e920dea5","name":"Rapel","price":50,"quantity":1}]'::jsonb 
WHERE id = 'f0b5a1fe-3d80-4db2-9ed6-d7bf2551d905';