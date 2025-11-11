-- Fix association_users select policies to avoid recursion and allow administrators to view members
-- Generated on 2025-11-11

-- Helper function to check association membership without RLS recursion
CREATE OR REPLACE FUNCTION public.user_is_member_of_association(p_association_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.association_users au
    WHERE au.association_id = p_association_id
      AND au.user_id = auth.uid()
      AND au.status = 'active'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_is_member_of_association(uuid) TO authenticated;

-- Replace recursive select policy
DROP POLICY IF EXISTS association_users_select_association ON public.association_users;

CREATE POLICY association_users_select_members
  ON public.association_users
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR user_is_member_of_association(association_id)
  );
