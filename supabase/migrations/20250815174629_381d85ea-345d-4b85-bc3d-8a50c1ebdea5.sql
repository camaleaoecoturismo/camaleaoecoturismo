-- Fix RLS being disabled on tables that have policies
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pontos_embarque ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_custom_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_pontos_embarque ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_pricing_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_custom_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;