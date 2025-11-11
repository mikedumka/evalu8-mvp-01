-- Seed data for Moose Jaw Minor Hockey association
-- Generated on 2025-11-11

DO $$
DECLARE
  v_sport_type_id UUID;
BEGIN
  INSERT INTO public.sport_types (name, status)
  VALUES ('Hockey', 'active')
  ON CONFLICT (name)
  DO UPDATE SET status = EXCLUDED.status
  RETURNING id
  INTO v_sport_type_id;

  IF v_sport_type_id IS NULL THEN
    SELECT id
    INTO v_sport_type_id
    FROM public.sport_types
    WHERE name = 'Hockey';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.associations
    WHERE name = 'Moose Jaw Minor Hockey'
  ) THEN
    INSERT INTO public.associations (
      name,
      slug,
      sport_type_id,
      contact_email,
      status
    )
    VALUES (
      'Moose Jaw Minor Hockey',
      'moose-jaw-minor-hockey',
      v_sport_type_id,
      'info@moosejawminorhockey.test',
      'active'
    );
  END IF;
END;
$$;
