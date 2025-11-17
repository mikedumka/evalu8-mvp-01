-- Ensure system_upsert_user returns a single composite column
-- Generated on 2025-11-17

CREATE OR REPLACE FUNCTION public.system_upsert_user(
  p_email TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_system_roles TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_status TEXT DEFAULT 'active',
  p_association_id UUID DEFAULT NULL,
  p_association_roles TEXT[] DEFAULT NULL
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
  v_association_id UUID := p_association_id;
  v_association_roles TEXT[] := NULL;
  v_allowed_association_roles CONSTANT TEXT[] := ARRAY[
    'Administrator',
    'Evaluator',
    'Intake Personnel'
  ];
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
    u.raw_app_meta_data,
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

  IF v_association_id IS NOT NULL THEN
    SELECT id
    INTO v_association_id
    FROM public.associations
    WHERE id = p_association_id
    LIMIT 1;

    IF v_association_id IS NULL THEN
      RAISE EXCEPTION 'Association % was not found.', p_association_id;
    END IF;

    v_association_roles := ARRAY(
      SELECT DISTINCT trimmed.role
      FROM (
        SELECT trim(role) AS role
        FROM unnest(COALESCE(p_association_roles, ARRAY[]::TEXT[])) AS role
        WHERE trim(role) <> ''
      ) AS trimmed
      WHERE trimmed.role = ANY(v_allowed_association_roles)
    );

    IF COALESCE(array_length(v_association_roles, 1), 0) = 0 THEN
      v_association_roles := ARRAY['Evaluator'];
    END IF;
  END IF;

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
    COALESCE(v_auth_user.raw_app_meta_data->>'provider', 'google'),
    v_auth_user.raw_app_meta_data->>'provider_id',
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

  IF v_association_id IS NOT NULL THEN
    INSERT INTO public.association_users AS membership (
      association_id,
      user_id,
      roles,
      status,
      invited_at,
      joined_at
    )
    VALUES (
      v_association_id,
      v_auth_user.id,
      v_association_roles,
      'active',
      NOW(),
      NOW()
    )
    ON CONFLICT (association_id, user_id)
    DO UPDATE SET
      roles = EXCLUDED.roles,
      status = 'active',
      joined_at = NOW();
  END IF;

  RETURN (
    SELECT u
    FROM public.users AS u
    WHERE u.id = v_auth_user.id
  );
END;
$$;
