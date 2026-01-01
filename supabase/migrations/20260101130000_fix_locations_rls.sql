
-- Fix RLS policies for locations table to use correct role name "Administrator"
-- Generated on 2026-01-01

-- Drop incorrect policies
DROP POLICY IF EXISTS "Admins can insert locations for their association" ON public.locations;
DROP POLICY IF EXISTS "Admins can update locations for their association" ON public.locations;
DROP POLICY IF EXISTS "Admins can delete locations for their association" ON public.locations;

-- Create corrected policies
CREATE POLICY "Admins can insert locations for their association"
    ON public.locations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.association_users au
            WHERE au.association_id = locations.association_id
            AND au.user_id = auth.uid()
            AND 'Administrator' = ANY(au.roles)
        )
    );

CREATE POLICY "Admins can update locations for their association"
    ON public.locations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.association_users au
            WHERE au.association_id = locations.association_id
            AND au.user_id = auth.uid()
            AND 'Administrator' = ANY(au.roles)
        )
    );

CREATE POLICY "Admins can delete locations for their association"
    ON public.locations FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.association_users au
            WHERE au.association_id = locations.association_id
            AND au.user_id = auth.uid()
            AND 'Administrator' = ANY(au.roles)
        )
    );
