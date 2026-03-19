-- Primeiro, verificar se a foreign key existe e removê-la se necessário
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'reservas_ponto_embarque_id_fkey'
    ) THEN
        ALTER TABLE reservas DROP CONSTRAINT reservas_ponto_embarque_id_fkey;
    END IF;
END $$;

-- Agora criar a foreign key correta para a tabela tour_boarding_points
ALTER TABLE reservas 
ADD CONSTRAINT reservas_ponto_embarque_id_fkey 
FOREIGN KEY (ponto_embarque_id) REFERENCES tour_boarding_points(id);