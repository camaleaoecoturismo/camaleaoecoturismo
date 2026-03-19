-- 🔧 CORREÇÃO DE SISTEMA DE RESERVAS - PARTE 1
-- Corrigindo problema com ENUMs e melhorando estrutura

-- 1. PRIMEIRO ADICIONAR CAMPOS NECESSÁRIOS SEM ALTERAR TIPOS
ALTER TABLE reservas
ADD COLUMN IF NOT EXISTS reserva_numero TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS data_confirmacao TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS data_cancelamento TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS motivo_cancelamento TEXT,
ADD COLUMN IF NOT EXISTS observacoes TEXT,
ADD COLUMN IF NOT EXISTS numero_participantes INTEGER DEFAULT 1 CHECK (numero_participantes > 0);

-- 2. FUNÇÃO PARA GERAR NÚMERO DE RESERVA AUTOMÁTICO
CREATE SEQUENCE IF NOT EXISTS reserva_numero_seq START 1;

CREATE OR REPLACE FUNCTION generate_reserva_numero()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reserva_numero IS NULL THEN
        NEW.reserva_numero := 'RES' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('reserva_numero_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar número automaticamente
DROP TRIGGER IF EXISTS trigger_generate_reserva_numero ON reservas;
CREATE TRIGGER trigger_generate_reserva_numero
    BEFORE INSERT ON reservas
    FOR EACH ROW
    EXECUTE FUNCTION generate_reserva_numero();

-- 3. CORRIGIR FOREIGN KEYS COM CONSTRAINT NAMES ÚNICOS
ALTER TABLE reservas 
DROP CONSTRAINT IF EXISTS fk_reservas_cliente,
DROP CONSTRAINT IF EXISTS fk_reservas_tour,
DROP CONSTRAINT IF EXISTS fk_reservas_ponto_embarque;

-- Adicionar foreign keys com nomes únicos
ALTER TABLE reservas
ADD CONSTRAINT fk_reservas_cliente 
FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_reservas_tour 
FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_reservas_ponto_embarque 
FOREIGN KEY (ponto_embarque_id) REFERENCES tour_boarding_points(id) ON DELETE RESTRICT;

-- 4. MELHORAR INDEXAÇÃO
CREATE INDEX IF NOT EXISTS idx_clientes_cpf ON clientes(cpf);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);
CREATE INDEX IF NOT EXISTS idx_reservas_cliente_id ON reservas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_reservas_tour_id ON reservas(tour_id);
CREATE INDEX IF NOT EXISTS idx_reservas_status ON reservas(status);
CREATE INDEX IF NOT EXISTS idx_reservas_data_reserva ON reservas(data_reserva);
CREATE INDEX IF NOT EXISTS idx_reservas_numero ON reservas(reserva_numero);

-- 5. CONSTRAINT PARA CPF ÚNICO (COM TRATAMENTO DE ERRO)
DO $$ 
BEGIN
    ALTER TABLE clientes ADD CONSTRAINT unique_cpf UNIQUE (cpf);
EXCEPTION 
    WHEN duplicate_table THEN 
        RAISE NOTICE 'Constraint unique_cpf já existe';
END $$;

-- 6. FUNÇÃO DE VALIDAÇÃO ROBUSTA
CREATE OR REPLACE FUNCTION validate_reserva_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar se tour existe
    IF NOT EXISTS (SELECT 1 FROM tours WHERE id = NEW.tour_id) THEN
        RAISE EXCEPTION 'Tour não encontrado: %', NEW.tour_id;
    END IF;
    
    -- Validar se cliente existe
    IF NOT EXISTS (SELECT 1 FROM clientes WHERE id = NEW.cliente_id) THEN
        RAISE EXCEPTION 'Cliente não encontrado: %', NEW.cliente_id;
    END IF;
    
    -- Validar se ponto de embarque pertence ao tour
    IF NOT EXISTS (
        SELECT 1 FROM tour_boarding_points 
        WHERE id = NEW.ponto_embarque_id AND tour_id = NEW.tour_id
    ) THEN
        RAISE EXCEPTION 'Ponto de embarque inválido para este tour';
    END IF;
    
    -- Validar valores monetários (se não forem nulos)
    IF (NEW.valor_passeio IS NOT NULL AND NEW.valor_passeio < 0) 
       OR (NEW.valor_pago IS NOT NULL AND NEW.valor_pago < 0) 
       OR (NEW.valor_total_com_opcionais IS NOT NULL AND NEW.valor_total_com_opcionais < 0) THEN
        RAISE EXCEPTION 'Valores monetários não podem ser negativos';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger de validação
DROP TRIGGER IF EXISTS trigger_validate_reserva_data ON reservas;
CREATE TRIGGER trigger_validate_reserva_data
    BEFORE INSERT OR UPDATE ON reservas
    FOR EACH ROW
    EXECUTE FUNCTION validate_reserva_data();

-- 7. FUNÇÃO PARA ATUALIZAR TIMESTAMPS
CREATE OR REPLACE FUNCTION update_reserva_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar timestamp de confirmação
    IF OLD.status != 'confirmada' AND NEW.status = 'confirmada' AND NEW.data_confirmacao IS NULL THEN
        NEW.data_confirmacao := NOW();
    END IF;
    
    -- Atualizar timestamp de cancelamento
    IF OLD.status != 'cancelada' AND NEW.status = 'cancelada' AND NEW.data_cancelamento IS NULL THEN
        NEW.data_cancelamento := NOW();
    END IF;
    
    -- Atualizar timestamp de pagamento
    IF OLD.payment_status != 'pago' AND NEW.payment_status = 'pago' AND NEW.data_pagamento IS NULL THEN
        NEW.data_pagamento := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para timestamps
DROP TRIGGER IF EXISTS trigger_update_reserva_timestamps ON reservas;
CREATE TRIGGER trigger_update_reserva_timestamps
    BEFORE UPDATE ON reservas
    FOR EACH ROW
    EXECUTE FUNCTION update_reserva_timestamps();

-- 8. TRIGGERS DE UPDATED_AT
DROP TRIGGER IF EXISTS update_clientes_updated_at ON clientes;
CREATE TRIGGER update_clientes_updated_at
    BEFORE UPDATE ON clientes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reservas_updated_at ON reservas;
CREATE TRIGGER update_reservas_updated_at
    BEFORE UPDATE ON reservas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();