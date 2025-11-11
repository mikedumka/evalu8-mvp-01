-- Configure storage buckets and security policies for Evalu8
-- Generated on 2025-11-11

-- Create buckets if they do not already exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('csv-operations', 'csv-operations', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('pdf-reports', 'pdf-reports', true)
ON CONFLICT (id) DO NOTHING;

-- Helper expression for current association
-- Ensures we only execute policies when the application sets the association context
CREATE OR REPLACE FUNCTION public.current_association_id()
RETURNS uuid AS $$
  SELECT current_setting('app.current_association_id', true)::uuid;
$$ LANGUAGE sql STABLE;

-- =========================================================================
-- CSV Operations bucket (private)
-- =========================================================================

CREATE POLICY "csv_operations_read_members"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'csv-operations'
    AND split_part(name, '/', 1) = current_setting('app.current_association_id', true)
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.current_association_id()
        AND au.user_id = auth.uid()
    )
  );

CREATE POLICY "csv_operations_admin_write"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'csv-operations'
    AND split_part(name, '/', 1) = current_setting('app.current_association_id', true)
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.current_association_id()
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

CREATE POLICY "csv_operations_admin_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'csv-operations'
    AND split_part(name, '/', 1) = current_setting('app.current_association_id', true)
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.current_association_id()
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  )
  WITH CHECK (
    bucket_id = 'csv-operations'
    AND split_part(name, '/', 1) = current_setting('app.current_association_id', true)
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.current_association_id()
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

CREATE POLICY "csv_operations_admin_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'csv-operations'
    AND split_part(name, '/', 1) = current_setting('app.current_association_id', true)
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.current_association_id()
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

-- =========================================================================
-- PDF Reports bucket (public read, admin write)
-- =========================================================================

CREATE POLICY "pdf_reports_public_read"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'pdf-reports'
    AND (
      current_setting('app.current_association_id', true) IS NULL
      OR split_part(name, '/', 1) = current_setting('app.current_association_id', true)
    )
  );

CREATE POLICY "pdf_reports_admin_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pdf-reports'
    AND split_part(name, '/', 1) = current_setting('app.current_association_id', true)
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.current_association_id()
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

CREATE POLICY "pdf_reports_admin_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'pdf-reports'
    AND split_part(name, '/', 1) = current_setting('app.current_association_id', true)
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.current_association_id()
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  )
  WITH CHECK (
    bucket_id = 'pdf-reports'
    AND split_part(name, '/', 1) = current_setting('app.current_association_id', true)
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.current_association_id()
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );

CREATE POLICY "pdf_reports_admin_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'pdf-reports'
    AND split_part(name, '/', 1) = current_setting('app.current_association_id', true)
    AND EXISTS (
      SELECT 1
      FROM public.association_users au
      WHERE au.association_id = public.current_association_id()
        AND au.user_id = auth.uid()
        AND 'Administrator' = ANY(au.roles)
    )
  );
