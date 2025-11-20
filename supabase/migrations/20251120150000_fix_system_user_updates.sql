-- Fix system_update_user_profile and system_update_user_status to correctly return data
-- Generated on 2025-11-20

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
  v_updated_user public.users;
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
  RETURNING * INTO v_updated_user;

  RETURN v_updated_user;
END;
$$;

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
  v_updated_user public.users;
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
  RETURNING * INTO v_updated_user;

  RETURN v_updated_user;
END;
$$;
