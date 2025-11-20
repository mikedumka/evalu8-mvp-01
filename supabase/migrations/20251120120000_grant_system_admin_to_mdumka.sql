-- Grant System Administrator role to mdumka@gmail.com
-- Generated on 2025-11-20

DO $$
DECLARE
  v_user_email TEXT := 'mdumka@gmail.com';
  v_user_id UUID;
BEGIN
  SELECT id
  INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(v_user_email)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User with email % not found. Skipping.', v_user_email;
    RETURN;
  END IF;

  -- Update association_users to include 'System Administrator' role
  -- We update any active association membership for this user to ensure they pass require_system_admin()
  UPDATE public.association_users
  SET roles = array_append(roles, 'System Administrator')
  WHERE user_id = v_user_id
    AND status = 'active'
    AND NOT ('System Administrator' = ANY(roles));

  -- Also update the users table system_roles column for consistency
  UPDATE public.users
  SET system_roles = array_append(system_roles, 'System Administrator')
  WHERE id = v_user_id
    AND NOT ('System Administrator' = ANY(system_roles));

END;
$$;
