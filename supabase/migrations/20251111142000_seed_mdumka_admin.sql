-- Ensure mdumka@gmail.com is an administrator for Moose Jaw Minor Hockey
-- Generated on 2025-11-11

DO $$
DECLARE
  v_association_id UUID;
  v_user_id UUID;
  v_user_email TEXT := 'mdumka@gmail.com';
  v_profile RECORD;
BEGIN
  SELECT id
  INTO v_association_id
  FROM public.associations
  WHERE name = 'Moose Jaw Minor Hockey'
  LIMIT 1;

  IF v_association_id IS NULL THEN
    RAISE NOTICE 'Moose Jaw Minor Hockey association not found. Skipping mdumka admin seed.';
    RETURN;
  END IF;

  SELECT id
  INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(v_user_email)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User with email % not found in auth.users. Skipping.', v_user_email;
    RETURN;
  END IF;

  SELECT email, raw_user_meta_data->>'full_name' AS full_name
  INTO v_profile
  FROM auth.users
  WHERE id = v_user_id;

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
    COALESCE(v_profile.email, v_user_email),
    NULLIF(v_profile.full_name, ''),
    'google',
    NULL,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.users.full_name),
    last_login_at = NOW();

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
