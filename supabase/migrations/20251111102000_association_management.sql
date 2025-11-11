-- Association management helpers and policies
-- Generated on 2025-11-11

-- Allow administrators to update association profile fields
CREATE POLICY associations_update_admin
  ON public.associations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.associations.id
        AND au.user_id = auth.uid()
        AND au.status = 'active'
        AND 'Administrator' = ANY(au.roles)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.associations.id
        AND au.user_id = auth.uid()
        AND au.status = 'active'
        AND 'Administrator' = ANY(au.roles)
    )
  );

-- Function to create an association and assign the current user as Administrator
CREATE OR REPLACE FUNCTION public.create_association_with_admin(
  p_name TEXT,
  p_sport_type_id UUID,
  p_contact_email TEXT
) RETURNS public.associations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_slug TEXT;
  v_original_slug TEXT;
  v_suffix INTEGER := 1;
  v_association public.associations;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Association name is required';
  END IF;

  IF p_sport_type_id IS NULL THEN
    RAISE EXCEPTION 'Sport type is required';
  END IF;

  v_slug := lower(regexp_replace(p_name, '[^a-z0-9]+', '-', 'g'));
  v_slug := trim(both '-' FROM v_slug);
  v_original_slug := COALESCE(NULLIF(v_slug, ''), 'association');
  v_slug := v_original_slug;

  WHILE EXISTS (SELECT 1 FROM public.associations WHERE slug = v_slug) LOOP
    v_suffix := v_suffix + 1;
    v_slug := v_original_slug || '-' || v_suffix::TEXT;
  END LOOP;

  INSERT INTO public.associations (name, slug, sport_type_id, contact_email, status)
  VALUES (p_name, v_slug, p_sport_type_id, p_contact_email, 'active')
  RETURNING * INTO v_association;

  INSERT INTO public.association_users (
    association_id,
    user_id,
    roles,
    status,
    invited_at,
    joined_at
  )
  VALUES (
    v_association.id,
    v_user_id,
    ARRAY['Administrator'],
    'active',
    now(),
    now()
  )
  ON CONFLICT (association_id, user_id)
  DO UPDATE SET
    roles = ARRAY['Administrator'],
    status = 'active',
    joined_at = now();

  PERFORM public.set_association_context(v_association.id);

  RETURN v_association;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_association_with_admin(TEXT, UUID, TEXT) TO authenticated;

-- Function to add or update association members by email with specified roles
CREATE OR REPLACE FUNCTION public.add_association_member_by_email(
  p_association_id UUID,
  p_email TEXT,
  p_roles TEXT[]
) RETURNS public.association_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester UUID := auth.uid();
  v_target_user_id UUID;
  v_membership public.association_users;
BEGIN
  IF v_requester IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.association_users au
    WHERE au.association_id = p_association_id
      AND au.user_id = v_requester
      AND au.status = 'active'
      AND 'Administrator' = ANY(au.roles)
  ) THEN
    RAISE EXCEPTION 'Administrator privileges are required to manage association members';
  END IF;

  SELECT id
  INTO v_target_user_id
  FROM public.users
  WHERE lower(email) = lower(p_email);

  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with the provided email was not found';
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
    p_association_id,
    v_target_user_id,
    COALESCE(NULLIF(p_roles, ARRAY[]::TEXT[]), ARRAY['Evaluator']),
    'active',
    now(),
    now()
  )
  ON CONFLICT (association_id, user_id)
  DO UPDATE SET
    roles = COALESCE(NULLIF(p_roles, ARRAY[]::TEXT[]), ARRAY['Evaluator']),
    status = 'active',
    joined_at = now();

  SELECT *
  INTO v_membership
  FROM public.association_users
  WHERE association_id = p_association_id
    AND user_id = v_target_user_id;

  RETURN v_membership;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_association_member_by_email(UUID, TEXT, TEXT[]) TO authenticated;