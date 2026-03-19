
-- CORREÇÕES DE DADOS HISTÓRICOS 2025 CONFORME PDF

-- 1. Corrigir numero_participantes da Trilha do Cacau - Mai (de 1 para 24)
UPDATE public.reservas 
SET numero_participantes = 24
WHERE id = '8e56352e-48db-444b-99d5-0d982bf03358';

-- 2. Corrigir gastos de agosto (reduzir R$ 790 do Vale do Catimbau - valor correto: 8378.36 - 790 = 7588.36)
UPDATE public.tour_costs 
SET valor_pago = 7588.36
WHERE id = 'f81094d9-c256-496e-9d5b-8080bf637720';

-- 3. Remover tour "Teste" de dezembro e seus dados relacionados
DELETE FROM public.tour_costs WHERE tour_id = '136d1f85-85b1-4ccc-9205-d56e82fdd5de';
DELETE FROM public.reservas WHERE tour_id = '136d1f85-85b1-4ccc-9205-d56e82fdd5de';
DELETE FROM public.tour_boarding_points WHERE tour_id = '136d1f85-85b1-4ccc-9205-d56e82fdd5de';
DELETE FROM public.tours WHERE id = '136d1f85-85b1-4ccc-9205-d56e82fdd5de';

-- 4. Corrigir valores de Manutenção e Investimentos conforme PDF
UPDATE public.monthly_general_costs 
SET unit_value = 376.30
WHERE year = 2025 AND month = '01' AND expense_type = 'manutencao';

UPDATE public.monthly_general_costs 
SET unit_value = 1669.30
WHERE year = 2025 AND month = '02' AND expense_type = 'manutencao';

UPDATE public.monthly_general_costs 
SET unit_value = 286.30
WHERE year = 2025 AND month = '03' AND expense_type = 'manutencao';

UPDATE public.monthly_general_costs 
SET unit_value = 1212.30
WHERE year = 2025 AND month = '04' AND expense_type = 'manutencao';

UPDATE public.monthly_general_costs 
SET unit_value = 2395.30
WHERE year = 2025 AND month = '05' AND expense_type = 'manutencao';

UPDATE public.monthly_general_costs 
SET unit_value = 1595.30
WHERE year = 2025 AND month = '06' AND expense_type = 'manutencao';

UPDATE public.monthly_general_costs 
SET unit_value = 2395.30
WHERE year = 2025 AND month = '07' AND expense_type = 'manutencao';

UPDATE public.monthly_general_costs 
SET unit_value = 1895.30
WHERE year = 2025 AND month = '08' AND expense_type = 'manutencao';

UPDATE public.monthly_general_costs 
SET unit_value = 2299.30
WHERE year = 2025 AND month = '09' AND expense_type = 'manutencao';

UPDATE public.monthly_general_costs 
SET unit_value = 3150.30
WHERE year = 2025 AND month = '10' AND expense_type = 'manutencao';

UPDATE public.monthly_general_costs 
SET unit_value = 3095.30
WHERE year = 2025 AND month = '11' AND expense_type = 'manutencao';

UPDATE public.monthly_general_costs 
SET unit_value = 5304.63
WHERE year = 2025 AND month = '12' AND expense_type = 'manutencao';
