-- Fix require_system_admin to check users.system_roles
-- Generated on 2025-11-20

CREATE OR REPLACE FUNCTION public.require_system_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check for System Administrator role in users table (primary source)
  IF EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.status = 'active'
      AND 'System Administrator' = ANY(u.system_roles)
  ) THEN
    RETURN;
  END IF;

  -- Check for System Administrator role in association_users table (legacy/bootstrap source)
  IF EXISTS (
    SELECT 1
    FROM public.association_users au
    WHERE au.user_id = auth.uid()
      AND au.status = 'active'
      AND 'System Administrator' = ANY(au.roles)
  ) THEN
    RETURN;
  END IF;

  RAISE EXCEPTION 'System Administrator privileges are required';
END;
$$;
