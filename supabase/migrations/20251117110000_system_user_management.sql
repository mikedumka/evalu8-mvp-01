-- System user management enhancements
-- Generated on 2025-11-17

-- Add status and system_roles columns to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  ADD COLUMN IF NOT EXISTS system_roles TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);

-- Helper to enforce system administrator access
CREATE OR REPLACE FUNCTION public.require_system_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.association_users au
    WHERE au.user_id = auth.uid()
      AND au.status = 'active'
      AND 'System Administrator' = ANY(au.roles)
  ) THEN
    RAISE EXCEPTION 'System Administrator privileges are required';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.require_system_admin() TO authenticated;

-- List users with aggregated association counts
CREATE OR REPLACE FUNCTION public.system_list_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  status TEXT,
  system_roles TEXT[],
  created_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  association_count INTEGER,
  active_association_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.require_system_admin();

  RETURN QUERY
    SELECT
      u.id,
      u.email,
      u.full_name,
      u.status,
      COALESCE(u.system_roles, ARRAY[]::TEXT[]),
      u.created_at,
      u.last_login_at,
      COALESCE(COUNT(au.id), 0)::INTEGER AS association_count,
      COALESCE(COUNT(au.id) FILTER (WHERE au.status = 'active'), 0)::INTEGER AS active_association_count
    FROM public.users u
    LEFT JOIN public.association_users au
      ON au.user_id = u.id
    GROUP BY u.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.system_list_users() TO authenticated;

-- Upsert a system user based on auth.users record
CREATE OR REPLACE FUNCTION public.system_upsert_user(
  p_email TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_system_roles TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_status TEXT DEFAULT 'active'
) RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user RECORD;
  v_status TEXT := LOWER(COALESCE(p_status, 'active'));
  v_full_name TEXT;
  v_roles TEXT[];
BEGIN
  PERFORM public.require_system_admin();

  IF v_status NOT IN ('active', 'inactive') THEN
    RAISE EXCEPTION 'Invalid status. Must be active or inactive.';
  END IF;

  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RAISE EXCEPTION 'Email is required.';
  END IF;

  SELECT
    u.id,
    u.email,
    u.raw_user_meta_data,
    u.app_metadata,
    u.created_at,
    u.last_sign_in_at
  INTO v_auth_user
  FROM auth.users u
  WHERE LOWER(u.email) = LOWER(p_email)
  ORDER BY u.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User with email % was not found in auth.users.', p_email;
  END IF;

  v_full_name := NULLIF(trim(COALESCE(p_full_name, v_auth_user.raw_user_meta_data->>'full_name')), '');
  v_roles := ARRAY(
    SELECT DISTINCT trim(role)
    FROM unnest(COALESCE(p_system_roles, ARRAY[]::TEXT[])) AS role
    WHERE trim(role) <> ''
  );

  INSERT INTO public.users AS target (
    id,
    email,
    full_name,
    auth_provider,
    auth_provider_id,
    created_at,
    last_login_at,
    status,
    system_roles
  )
  VALUES (
    v_auth_user.id,
    v_auth_user.email,
    v_full_name,
    COALESCE(v_auth_user.app_metadata->>'provider', 'google'),
    v_auth_user.app_metadata->>'provider_id',
    COALESCE(v_auth_user.created_at, NOW()),
    v_auth_user.last_sign_in_at,
    v_status,
    COALESCE(v_roles, ARRAY[]::TEXT[])
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(v_full_name, target.full_name),
    auth_provider = EXCLUDED.auth_provider,
    auth_provider_id = EXCLUDED.auth_provider_id,
    last_login_at = EXCLUDED.last_login_at,
    status = v_status,
    system_roles = COALESCE(v_roles, ARRAY[]::TEXT[]);

  RETURN (SELECT * FROM public.users WHERE id = v_auth_user.id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.system_upsert_user(TEXT, TEXT, TEXT[], TEXT) TO authenticated;

-- Update user profile details
CREATE OR REPLACE FUNCTION public.system_update_user_profile(
  p_user_id UUID,
  p_full_name TEXT,
  p_system_roles TEXT[]
) RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_roles TEXT[];
BEGIN
  PERFORM public.require_system_admin();

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User id is required.';
  END IF;

  v_roles := ARRAY(
    SELECT DISTINCT trim(role)
    FROM unnest(COALESCE(p_system_roles, ARRAY[]::TEXT[])) AS role
    WHERE trim(role) <> ''
  );

  UPDATE public.users
  SET
    full_name = NULLIF(trim(p_full_name), ''),
    system_roles = COALESCE(v_roles, ARRAY[]::TEXT[])
  WHERE id = p_user_id
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.system_update_user_profile(UUID, TEXT, TEXT[]) TO authenticated;

-- Update user status
CREATE OR REPLACE FUNCTION public.system_update_user_status(
  p_user_id UUID,
  p_status TEXT
) RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT := LOWER(COALESCE(p_status, 'active'));
BEGIN
  PERFORM public.require_system_admin();

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User id is required.';
  END IF;

  IF v_status NOT IN ('active', 'inactive') THEN
    RAISE EXCEPTION 'Invalid status. Must be active or inactive.';
  END IF;

  UPDATE public.users
  SET status = v_status
  WHERE id = p_user_id
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.system_update_user_status(UUID, TEXT) TO authenticated;
