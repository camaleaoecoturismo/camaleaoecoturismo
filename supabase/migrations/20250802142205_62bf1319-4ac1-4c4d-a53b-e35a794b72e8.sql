-- Limpar reservas com pontos de embarque inexistentes
DELETE FROM reservas 
WHERE ponto_embarque_id NOT IN (SELECT id FROM tour_boarding_points);

-- Agora criar a foreign key correta
ALTER TABLE reservas 
ADD CONSTRAINT reservas_ponto_embarque_id_fkey 
FOREIGN KEY (ponto_embarque_id) REFERENCES tour_boarding_points(id);