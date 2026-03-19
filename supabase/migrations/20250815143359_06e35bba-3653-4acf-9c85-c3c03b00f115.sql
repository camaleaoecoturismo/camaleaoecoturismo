-- Adicionar campo de etiqueta aos tours
ALTER TABLE tours 
ADD COLUMN etiqueta TEXT NULL;

-- Comentário sobre o campo
COMMENT ON COLUMN tours.etiqueta IS 'Etiqueta do passeio (ex: Vagas encerradas, Últimas vagas, etc.)';