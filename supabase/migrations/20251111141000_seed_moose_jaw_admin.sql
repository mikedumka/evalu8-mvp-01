-- Ensure Moose Jaw Minor Hockey has an administrator membership
-- Generated on 2025-11-11

DO $$
DECLARE
  v_association_id UUID;
  v_user_id UUID;
  v_user_email TEXT;
  v_existing_user RECORD;
BEGIN
  SELECT id INTO v_association_id
  FROM public.associations
  WHERE name = 'Moose Jaw Minor Hockey'
  LIMIT 1;

  IF v_association_id IS NULL THEN
    RAISE NOTICE 'Moose Jaw Minor Hockey association not found. Skipping admin seed.';
    RETURN;
  END IF;

  SELECT id, email
  INTO v_user_id, v_user_email
  FROM auth.users
  ORDER BY created_at
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No users found in auth.users. Skipping admin seed.';
    RETURN;
  END IF;

  SELECT *
  INTO v_existing_user
  FROM public.users
  WHERE id = v_user_id;

  IF v_existing_user IS NULL THEN
    INSERT INTO public.users (
      id,
      email,
      full_name,
      auth_provider,
      auth_provider_id,
      created_at,
      last_login_at
    )
    VALUES (
      v_user_id,
      v_user_email,
      NULL,
      'google',
      NULL,
      NOW(),
      NOW()
    )
    ON CONFLICT (id)
    DO NOTHING;
  END IF;

  INSERT INTO public.association_users (
    association_id,
    user_id,
    roles,
    status,
    invited_at,
    joined_at
  )
  VALUES (
    v_association_id,
    v_user_id,
    ARRAY['Administrator'],
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (association_id, user_id)
  DO UPDATE SET
    roles = ARRAY['Administrator'],
    status = 'active',
    joined_at = EXCLUDED.joined_at;
END;
$$;
