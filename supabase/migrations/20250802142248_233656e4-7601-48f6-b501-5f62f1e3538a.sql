-- Limpar reservas com pontos de embarque inexistentes
DELETE FROM reservas 
WHERE ponto_embarque_id NOT IN (SELECT id FROM tour_boarding_points);