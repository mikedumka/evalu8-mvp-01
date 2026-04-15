-- Migration to allow Administrators to insert evaluations on behalf of evaluators
-- This is required for the "Generate Test Data" functionality which seeds
-- evaluation scores for all assigned evaluators, not just the current user.

DROP POLICY IF EXISTS "evaluations_insert_admin" ON public.evaluations;

CREATE POLICY "evaluations_insert_admin"
ON public.evaluations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.association_users au
    WHERE au.association_id = public.evaluations.association_id
    AND au.user_id = auth.uid()
    AND 'Administrator' = ANY(au.roles)
  )
);
