-- Seed cohorts for Moose Jaw Minor Hockey
DO $$
DECLARE
  v_association_id UUID;
BEGIN
  -- Get the association ID
  SELECT id INTO v_association_id
  FROM public.associations
  WHERE name = 'Moose Jaw Minor Hockey';

  -- Only proceed if association exists
  IF v_association_id IS NOT NULL THEN
    -- Insert U11
    INSERT INTO public.cohorts (association_id, name, status)
    VALUES (v_association_id, 'U11', 'active')
    ON CONFLICT DO NOTHING;

    -- Insert U13
    INSERT INTO public.cohorts (association_id, name, status)
    VALUES (v_association_id, 'U13', 'active')
    ON CONFLICT DO NOTHING;

    -- Insert U15
    INSERT INTO public.cohorts (association_id, name, status)
    VALUES (v_association_id, 'U15', 'active')
    ON CONFLICT DO NOTHING;
    
    -- Insert U18
    INSERT INTO public.cohorts (association_id, name, status)
    VALUES (v_association_id, 'U18', 'active')
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;
