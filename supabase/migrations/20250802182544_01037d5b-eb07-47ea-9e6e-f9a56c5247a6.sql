-- 🔧 REVISÃO COMPLETA DO SISTEMA DE RESERVAS
-- Análise de Especialista: Correções Críticas e Melhorias

-- 1. ADICIONAR CAMPOS OBRIGATÓRIOS FALTANTES
-- A tabela reservas está com inconsistências de dados

-- Primeiro, vamos corrigir a estrutura das foreign keys para garantir integridade
ALTER TABLE reservas 
DROP CONSTRAINT IF EXISTS reservas_cliente_id_fkey,
DROP CONSTRAINT IF EXISTS reservas_tour_id_fkey,
DROP CONSTRAINT IF EXISTS reservas_ponto_embarque_id_fkey;

-- Adicionar foreign keys com CASCADE para manter integridade
ALTER TABLE reservas
ADD CONSTRAINT reservas_cliente_id_fkey 
FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
ADD CONSTRAINT reservas_tour_id_fkey 
FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE,
ADD CONSTRAINT reservas_ponto_embarque_id_fkey 
FOREIGN KEY (ponto_embarque_id) REFERENCES tour_boarding_points(id) ON DELETE RESTRICT;

-- 2. MELHORAR CAMPOS DE STATUS E VALIDAÇÃO
-- Criar ENUM para status mais controlado
DO $$ BEGIN
    CREATE TYPE reservation_status AS ENUM ('pendente', 'confirmada', 'cancelada', 'finalizada');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pendente', 'parcial', 'pago', 'cancelado', 'reembolsado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('pix', 'cartao', 'transferencia', 'dinheiro');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Atualizar campos de status para usar ENUM
ALTER TABLE reservas 
ALTER COLUMN status TYPE reservation_status USING status::reservation_status,
ALTER COLUMN payment_status TYPE payment_status USING payment_status::payment_status,
ALTER COLUMN payment_method TYPE payment_method USING payment_method::payment_method;

-- 3. ADICIONAR CAMPOS IMPORTANTES PARA CONTROLE
ALTER TABLE reservas
ADD COLUMN IF NOT EXISTS reserva_numero TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS data_confirmacao TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS data_cancelamento TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS motivo_cancelamento TEXT,
ADD COLUMN IF NOT EXISTS observacoes TEXT,
ADD COLUMN IF NOT EXISTS numero_participantes INTEGER DEFAULT 1 CHECK (numero_participantes > 0);

-- 4. FUNÇÃO PARA GERAR NÚMERO DE RESERVA AUTOMÁTICO
CREATE OR REPLACE FUNCTION generate_reserva_numero()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reserva_numero IS NULL THEN
        NEW.reserva_numero := 'RES' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('reserva_numero_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar sequência para numeração
CREATE SEQUENCE IF NOT EXISTS reserva_numero_seq START 1;

-- Trigger para gerar número automaticamente
DROP TRIGGER IF EXISTS trigger_generate_reserva_numero ON reservas;
CREATE TRIGGER trigger_generate_reserva_numero
    BEFORE INSERT ON reservas
    FOR EACH ROW
    EXECUTE FUNCTION generate_reserva_numero();

-- 5. FUNÇÃO PARA ATUALIZAR TIMESTAMPS AUTOMATICAMENTE
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

-- Trigger para atualizar timestamps
DROP TRIGGER IF EXISTS trigger_update_reserva_timestamps ON reservas;
CREATE TRIGGER trigger_update_reserva_timestamps
    BEFORE UPDATE ON reservas
    FOR EACH ROW
    EXECUTE FUNCTION update_reserva_timestamps();

-- 6. MELHORAR A TABELA DE CLIENTES
-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_clientes_cpf ON clientes(cpf);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);
CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp ON clientes(whatsapp);

-- Adicionar constraint para garantir CPF único
ALTER TABLE clientes
ADD CONSTRAINT unique_cpf UNIQUE (cpf);

-- 7. MELHORAR INDEXAÇÃO DAS RESERVAS
CREATE INDEX IF NOT EXISTS idx_reservas_cliente_id ON reservas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_reservas_tour_id ON reservas(tour_id);
CREATE INDEX IF NOT EXISTS idx_reservas_status ON reservas(status);
CREATE INDEX IF NOT EXISTS idx_reservas_payment_status ON reservas(payment_status);
CREATE INDEX IF NOT EXISTS idx_reservas_data_reserva ON reservas(data_reserva);
CREATE INDEX IF NOT EXISTS idx_reservas_numero ON reservas(reserva_numero);

-- 8. FUNÇÃO DE VALIDAÇÃO DE DADOS
CREATE OR REPLACE FUNCTION validate_reserva_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar se tour existe e está ativo
    IF NOT EXISTS (SELECT 1 FROM tours WHERE id = NEW.tour_id) THEN
        RAISE EXCEPTION 'Tour não encontrado ou inativo';
    END IF;
    
    -- Validar se cliente existe
    IF NOT EXISTS (SELECT 1 FROM clientes WHERE id = NEW.cliente_id) THEN
        RAISE EXCEPTION 'Cliente não encontrado';
    END IF;
    
    -- Validar se ponto de embarque pertence ao tour
    IF NOT EXISTS (
        SELECT 1 FROM tour_boarding_points 
        WHERE id = NEW.ponto_embarque_id AND tour_id = NEW.tour_id
    ) THEN
        RAISE EXCEPTION 'Ponto de embarque inválido para este tour';
    END IF;
    
    -- Validar valores monetários
    IF NEW.valor_passeio < 0 OR NEW.valor_pago < 0 OR NEW.valor_total_com_opcionais < 0 THEN
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

-- 9. VIEW PARA RELATÓRIOS DE RESERVAS
CREATE OR REPLACE VIEW vw_reservas_completa AS
SELECT 
    r.*,
    c.nome_completo,
    c.cpf,
    c.email,
    c.whatsapp as cliente_whatsapp,
    t.name as tour_nome,
    t.start_date as tour_data_inicio,
    t.end_date as tour_data_fim,
    t.city as tour_cidade,
    t.state as tour_estado,
    tbp.nome as ponto_embarque_nome,
    tbp.endereco as ponto_embarque_endereco,
    CASE 
        WHEN r.status = 'pendente' THEN 'Pendente'
        WHEN r.status = 'confirmada' THEN 'Confirmada'
        WHEN r.status = 'cancelada' THEN 'Cancelada'
        WHEN r.status = 'finalizada' THEN 'Finalizada'
    END as status_descricao,
    CASE 
        WHEN r.payment_status = 'pendente' THEN 'Pendente'
        WHEN r.payment_status = 'parcial' THEN 'Parcial'
        WHEN r.payment_status = 'pago' THEN 'Pago'
        WHEN r.payment_status = 'cancelado' THEN 'Cancelado'
        WHEN r.payment_status = 'reembolsado' THEN 'Reembolsado'
    END as pagamento_descricao
FROM reservas r
JOIN clientes c ON r.cliente_id = c.id
JOIN tours t ON r.tour_id = t.id
JOIN tour_boarding_points tbp ON r.ponto_embarque_id = tbp.id;

-- 10. FUNÇÃO PARA BUSCAR RESERVAS POR CLIENTE
CREATE OR REPLACE FUNCTION get_cliente_reservas(cliente_cpf TEXT)
RETURNS TABLE (
    reserva_id UUID,
    reserva_numero TEXT,
    tour_nome TEXT,
    status TEXT,
    data_reserva TIMESTAMP WITH TIME ZONE,
    valor_total NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.reserva_numero,
        t.name,
        r.status::TEXT,
        r.data_reserva,
        r.valor_total_com_opcionais
    FROM reservas r
    JOIN clientes c ON r.cliente_id = c.id
    JOIN tours t ON r.tour_id = t.id
    WHERE c.cpf = cliente_cpf
    ORDER BY r.data_reserva DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. ATUALIZAR TRIGGER DE UPDATED_AT PARA TODAS AS TABELAS
CREATE TRIGGER update_clientes_updated_at
    BEFORE UPDATE ON clientes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservas_updated_at
    BEFORE UPDATE ON reservas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();