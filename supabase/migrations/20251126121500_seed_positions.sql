-- Seed positions for Moose Jaw Minor Hockey
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
    -- Insert Forward
    INSERT INTO public.position_types (association_id, name, status)
    VALUES (v_association_id, 'Forward', 'active')
    ON CONFLICT DO NOTHING;

    -- Insert Defense
    INSERT INTO public.position_types (association_id, name, status)
    VALUES (v_association_id, 'Defense', 'active')
    ON CONFLICT DO NOTHING;

    -- Insert Goalie
    INSERT INTO public.position_types (association_id, name, status)
    VALUES (v_association_id, 'Goalie', 'active')
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;
