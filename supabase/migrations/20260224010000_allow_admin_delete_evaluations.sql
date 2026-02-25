-- Migration to allow Administrators to delete evaluations
-- This is required for the "Clear Data" functionality in testing/admin panels

-- Drop existing delete policy if it exists (to start fresh or update)
DROP POLICY IF EXISTS "evaluations_delete_admin" ON public.evaluations;

-- Create DELETE policy for Administrators
-- Algorithm: Allow delete if the user is an Administrator for the association linked to the evaluation
CREATE POLICY "evaluations_delete_admin"
ON public.evaluations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.association_users au 
    WHERE au.association_id = public.evaluations.association_id
    AND au.user_id = auth.uid()
    AND 'Administrator' = ANY(au.roles)
  )
);
