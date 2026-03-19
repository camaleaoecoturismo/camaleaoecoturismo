
-- Badge definitions table
CREATE TABLE public.badge_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT NOT NULL DEFAULT 'award',
    color TEXT NOT NULL DEFAULT '#820AD1',
    requirement_type TEXT NOT NULL, -- 'tours_count', 'total_spent', 'consecutive_months', 'specific_tour', 'first_tour'
    requirement_value INTEGER NOT NULL DEFAULT 1,
    points_reward INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Level definitions table
CREATE TABLE public.level_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    min_points INTEGER NOT NULL,
    max_points INTEGER,
    icon TEXT NOT NULL DEFAULT 'star',
    color TEXT NOT NULL DEFAULT '#820AD1',
    benefits TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Client accounts - links Supabase auth to clientes table
CREATE TABLE public.client_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL UNIQUE,
    total_points INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Client points history
CREATE TABLE public.client_points_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_account_id UUID REFERENCES public.client_accounts(id) ON DELETE CASCADE NOT NULL,
    reserva_id UUID REFERENCES public.reservas(id) ON DELETE SET NULL,
    points INTEGER NOT NULL,
    description TEXT NOT NULL,
    transaction_type TEXT NOT NULL, -- 'earned', 'redeemed', 'bonus', 'adjusted'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Client earned badges
CREATE TABLE public.client_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_account_id UUID REFERENCES public.client_accounts(id) ON DELETE CASCADE NOT NULL,
    badge_id UUID REFERENCES public.badge_definitions(id) ON DELETE CASCADE NOT NULL,
    reserva_id UUID REFERENCES public.reservas(id) ON DELETE SET NULL,
    earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(client_account_id, badge_id)
);

-- Client communications
CREATE TABLE public.client_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_account_id UUID REFERENCES public.client_accounts(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info', -- 'info', 'promo', 'reminder', 'alert'
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_points_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_communications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for badge_definitions
CREATE POLICY "Anyone can view badges" ON public.badge_definitions FOR SELECT USING (true);
CREATE POLICY "Admins can manage badges" ON public.badge_definitions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for level_definitions
CREATE POLICY "Anyone can view levels" ON public.level_definitions FOR SELECT USING (true);
CREATE POLICY "Admins can manage levels" ON public.level_definitions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for client_accounts
CREATE POLICY "Clients can view own account" ON public.client_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all accounts" ON public.client_accounts FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage accounts" ON public.client_accounts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can create account during signup" ON public.client_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for client_points_history
CREATE POLICY "Clients can view own points" ON public.client_points_history FOR SELECT USING (EXISTS (SELECT 1 FROM client_accounts WHERE id = client_account_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage points" ON public.client_points_history FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for client_badges
CREATE POLICY "Clients can view own badges" ON public.client_badges FOR SELECT USING (EXISTS (SELECT 1 FROM client_accounts WHERE id = client_account_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage badges" ON public.client_badges FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for client_communications
CREATE POLICY "Clients can view own communications" ON public.client_communications FOR SELECT USING (EXISTS (SELECT 1 FROM client_accounts WHERE id = client_account_id AND user_id = auth.uid()));
CREATE POLICY "Clients can update own communications" ON public.client_communications FOR UPDATE USING (EXISTS (SELECT 1 FROM client_accounts WHERE id = client_account_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage communications" ON public.client_communications FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default levels
INSERT INTO public.level_definitions (name, min_points, max_points, icon, color, benefits, order_index) VALUES
('Explorador', 0, 99, 'compass', '#6B7280', 'Acesso básico à área do cliente', 0),
('Aventureiro', 100, 299, 'map', '#10B981', 'Acesso antecipado a novos passeios', 1),
('Desbravador', 300, 599, 'mountain', '#3B82F6', 'Descontos exclusivos de 5%', 2),
('Expedicionário', 600, 999, 'globe', '#8B5CF6', 'Descontos de 10% + brindes especiais', 3),
('Lenda Camaleão', 1000, NULL, 'crown', '#F59E0B', 'Descontos de 15% + experiências VIP', 4);

-- Insert default badges
INSERT INTO public.badge_definitions (name, description, icon, color, requirement_type, requirement_value, points_reward) VALUES
('Primeira Aventura', 'Completou seu primeiro passeio', 'flag', '#10B981', 'first_tour', 1, 50),
('Explorador Iniciante', 'Completou 3 passeios', 'compass', '#3B82F6', 'tours_count', 3, 100),
('Viajante Frequente', 'Completou 5 passeios', 'map', '#8B5CF6', 'tours_count', 5, 150),
('Aventureiro Nato', 'Completou 10 passeios', 'mountain', '#F59E0B', 'tours_count', 10, 300),
('Lenda da Trilha', 'Completou 20 passeios', 'trophy', '#EF4444', 'tours_count', 20, 500),
('Investidor', 'Gastou mais de R$ 1.000', 'wallet', '#10B981', 'total_spent', 1000, 100),
('Grande Investidor', 'Gastou mais de R$ 5.000', 'gem', '#8B5CF6', 'total_spent', 5000, 300),
('Mecenas', 'Gastou mais de R$ 10.000', 'crown', '#F59E0B', 'total_spent', 10000, 500);

-- Function to calculate points for a completed tour
CREATE OR REPLACE FUNCTION public.calculate_tour_points(valor_pago NUMERIC)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
    -- 1 point for every R$ 10 spent
    RETURN GREATEST(10, FLOOR(valor_pago / 10)::INTEGER);
END;
$$;

-- Function to get client level
CREATE OR REPLACE FUNCTION public.get_client_level(total_points INTEGER)
RETURNS TABLE(level_name TEXT, level_icon TEXT, level_color TEXT, level_benefits TEXT)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT name, icon, color, benefits
    FROM level_definitions
    WHERE min_points <= total_points
      AND (max_points IS NULL OR max_points >= total_points)
    ORDER BY order_index DESC
    LIMIT 1;
END;
$$;

-- Function to check and award badges
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_client_account_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tours_count INTEGER;
    v_total_spent NUMERIC;
    v_badge RECORD;
    v_points_to_add INTEGER := 0;
BEGIN
    -- Get client stats
    SELECT 
        COUNT(*),
        COALESCE(SUM(r.valor_pago), 0)
    INTO v_tours_count, v_total_spent
    FROM reservas r
    JOIN client_accounts ca ON ca.cliente_id = r.cliente_id
    WHERE ca.id = p_client_account_id
      AND r.status IN ('confirmada', 'confirmado')
      AND r.payment_status = 'pago';

    -- Check each badge
    FOR v_badge IN 
        SELECT * FROM badge_definitions 
        WHERE is_active = true
          AND id NOT IN (SELECT badge_id FROM client_badges WHERE client_account_id = p_client_account_id)
    LOOP
        IF (v_badge.requirement_type = 'first_tour' AND v_tours_count >= 1) OR
           (v_badge.requirement_type = 'tours_count' AND v_tours_count >= v_badge.requirement_value) OR
           (v_badge.requirement_type = 'total_spent' AND v_total_spent >= v_badge.requirement_value) THEN
            
            -- Award badge
            INSERT INTO client_badges (client_account_id, badge_id)
            VALUES (p_client_account_id, v_badge.id);
            
            -- Add points reward
            v_points_to_add := v_points_to_add + v_badge.points_reward;
            
            -- Log points
            IF v_badge.points_reward > 0 THEN
                INSERT INTO client_points_history (client_account_id, points, description, transaction_type)
                VALUES (p_client_account_id, v_badge.points_reward, 'Bônus pelo selo: ' || v_badge.name, 'bonus');
            END IF;
        END IF;
    END LOOP;
    
    -- Update total points
    IF v_points_to_add > 0 THEN
        UPDATE client_accounts
        SET total_points = total_points + v_points_to_add, updated_at = now()
        WHERE id = p_client_account_id;
    END IF;
END;
$$;

-- Function to process completed tour (call when payment confirmed)
CREATE OR REPLACE FUNCTION public.process_completed_tour(p_reserva_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_client_account_id UUID;
    v_valor_pago NUMERIC;
    v_points INTEGER;
BEGIN
    -- Get client account and payment value
    SELECT ca.id, r.valor_pago
    INTO v_client_account_id, v_valor_pago
    FROM reservas r
    JOIN client_accounts ca ON ca.cliente_id = r.cliente_id
    WHERE r.id = p_reserva_id;
    
    IF v_client_account_id IS NULL THEN
        RETURN; -- Client doesn't have an account yet
    END IF;
    
    -- Check if already processed
    IF EXISTS (SELECT 1 FROM client_points_history WHERE reserva_id = p_reserva_id AND transaction_type = 'earned') THEN
        RETURN;
    END IF;
    
    -- Calculate and add points
    v_points := calculate_tour_points(COALESCE(v_valor_pago, 0));
    
    INSERT INTO client_points_history (client_account_id, reserva_id, points, description, transaction_type)
    VALUES (v_client_account_id, p_reserva_id, v_points, 'Pontos por participação em passeio', 'earned');
    
    -- Update total points
    UPDATE client_accounts
    SET total_points = total_points + v_points, updated_at = now()
    WHERE id = v_client_account_id;
    
    -- Check for new badges
    PERFORM check_and_award_badges(v_client_account_id);
END;
$$;

-- Function to get client stats for admin reports
CREATE OR REPLACE FUNCTION public.get_client_stats(p_cliente_id UUID)
RETURNS TABLE(
    tours_count BIGINT,
    total_spent NUMERIC,
    total_points INTEGER,
    badges_count BIGINT,
    level_name TEXT,
    level_color TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_points INTEGER;
BEGIN
    -- Get total points
    SELECT COALESCE(ca.total_points, 0)
    INTO v_total_points
    FROM client_accounts ca
    WHERE ca.cliente_id = p_cliente_id;
    
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM reservas r WHERE r.cliente_id = p_cliente_id AND r.status IN ('confirmada', 'confirmado') AND r.payment_status = 'pago'),
        (SELECT COALESCE(SUM(r.valor_pago), 0) FROM reservas r WHERE r.cliente_id = p_cliente_id AND r.status IN ('confirmada', 'confirmado') AND r.payment_status = 'pago'),
        COALESCE(v_total_points, 0),
        (SELECT COUNT(*) FROM client_badges cb JOIN client_accounts ca ON ca.id = cb.client_account_id WHERE ca.cliente_id = p_cliente_id),
        (SELECT ld.name FROM level_definitions ld WHERE ld.min_points <= COALESCE(v_total_points, 0) AND (ld.max_points IS NULL OR ld.max_points >= COALESCE(v_total_points, 0)) ORDER BY ld.order_index DESC LIMIT 1),
        (SELECT ld.color FROM level_definitions ld WHERE ld.min_points <= COALESCE(v_total_points, 0) AND (ld.max_points IS NULL OR ld.max_points >= COALESCE(v_total_points, 0)) ORDER BY ld.order_index DESC LIMIT 1);
END;
$$;
