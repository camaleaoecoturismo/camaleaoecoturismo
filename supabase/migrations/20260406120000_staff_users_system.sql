-- ============================================================
-- Staff Users System
-- Adds staff role, profiles, permissions and activity logging
-- ============================================================

-- 1. Add 'staff' value to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'staff';

-- 2. staff_profiles: stores extra info about staff users
CREATE TABLE IF NOT EXISTS staff_profiles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  cargo      TEXT,
  telefone   TEXT,
  avatar_url TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_profiles_admin_all" ON staff_profiles
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "staff_profiles_read_own" ON staff_profiles
  FOR SELECT USING (user_id = auth.uid());

-- 3. staff_permissions: which sections each staff user can access
CREATE TABLE IF NOT EXISTS staff_permissions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section    TEXT NOT NULL,
  can_access BOOLEAN NOT NULL DEFAULT false,
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, section)
);

ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_permissions_admin_all" ON staff_permissions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "staff_permissions_read_own" ON staff_permissions
  FOR SELECT USING (user_id = auth.uid());

-- 4. staff_activity_logs: detailed activity tracking
CREATE TABLE IF NOT EXISTS staff_activity_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email   TEXT,
  action_type  TEXT NOT NULL, -- 'login', 'logout', 'page_view', 'create', 'update', 'delete'
  section      TEXT,
  details      JSONB,
  session_id   TEXT,
  duration_sec INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE staff_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_activity_admin_all" ON staff_activity_logs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "staff_activity_insert_own" ON staff_activity_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Staff can also read their own logs
CREATE POLICY "staff_activity_read_own" ON staff_activity_logs
  FOR SELECT USING (user_id = auth.uid());

-- 5. Helper: get staff user list with last activity
CREATE OR REPLACE VIEW staff_users_view AS
SELECT
  u.id AS user_id,
  u.email,
  sp.name,
  sp.cargo,
  sp.telefone,
  sp.avatar_url,
  sp.is_active,
  sp.created_at,
  ur.role,
  (
    SELECT MAX(sal.created_at)
    FROM staff_activity_logs sal
    WHERE sal.user_id = u.id
      AND sal.action_type = 'login'
  ) AS last_login
FROM auth.users u
JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN staff_profiles sp ON sp.user_id = u.id
WHERE ur.role IN ('admin', 'staff');

-- Revoke public access to view; only accessible via security definer function
REVOKE ALL ON staff_users_view FROM PUBLIC, anon, authenticated;

-- 6. Security-definer function to get staff list (accessible to admins only)
CREATE OR REPLACE FUNCTION get_staff_users()
RETURNS TABLE (
  user_id    UUID,
  email      TEXT,
  name       TEXT,
  cargo      TEXT,
  telefone   TEXT,
  avatar_url TEXT,
  is_active  BOOLEAN,
  created_at TIMESTAMPTZ,
  role       TEXT,
  last_login TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    v.user_id,
    v.email,
    v.name,
    v.cargo,
    v.telefone,
    v.avatar_url,
    v.is_active,
    v.created_at,
    v.role::TEXT,
    v.last_login
  FROM staff_users_view v
  ORDER BY v.created_at ASC;
END;
$$;

-- 7. Function to update staff permissions (admin only)
CREATE OR REPLACE FUNCTION update_staff_permissions(
  p_user_id    UUID,
  p_sections   TEXT[],
  p_can_access BOOLEAN[]
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i INT;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF array_length(p_sections, 1) != array_length(p_can_access, 1) THEN
    RAISE EXCEPTION 'Arrays de seções e permissões devem ter o mesmo tamanho';
  END IF;

  FOR i IN 1..array_length(p_sections, 1) LOOP
    INSERT INTO staff_permissions (user_id, section, can_access, granted_by)
    VALUES (p_user_id, p_sections[i], p_can_access[i], auth.uid())
    ON CONFLICT (user_id, section) DO UPDATE
      SET can_access = EXCLUDED.can_access,
          granted_by = EXCLUDED.granted_by;
  END LOOP;
END;
$$;

-- 8. Function to deactivate/activate a staff user
CREATE OR REPLACE FUNCTION set_staff_active(p_user_id UUID, p_active BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Prevent deactivating yourself
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode desativar sua própria conta';
  END IF;

  UPDATE staff_profiles
  SET is_active = p_active, updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- 9. Updated trigger for staff_profiles.updated_at
CREATE OR REPLACE FUNCTION update_staff_profiles_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER staff_profiles_updated_at
  BEFORE UPDATE ON staff_profiles
  FOR EACH ROW EXECUTE FUNCTION update_staff_profiles_updated_at();
