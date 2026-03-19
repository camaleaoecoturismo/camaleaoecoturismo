-- Fix valor_total_com_opcionais for all paid reservations with optionals where it's 0 or NULL
-- Calculate as: valor_passeio + sum of (optional.price * optional.quantity)
UPDATE reservas
SET valor_total_com_opcionais = valor_passeio + (
  SELECT COALESCE(SUM((item->>'price')::numeric * (item->>'quantity')::numeric), 0)
  FROM jsonb_array_elements(selected_optional_items) AS item
)
WHERE selected_optional_items IS NOT NULL
  AND jsonb_array_length(selected_optional_items) > 0
  AND (valor_total_com_opcionais IS NULL OR valor_total_com_opcionais = 0)
  AND valor_passeio IS NOT NULL;