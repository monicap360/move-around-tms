-- ===========================================
-- MOVEAROUND TMS
-- DEMO ORGANIZATION: Acme Aggregates
-- Migration 054: Complete demo seed data
-- ===========================================
-- 
-- Creates complete demo org with:
-- - 1 organization (Acme Aggregates)
-- - 2 quarry sites
-- - 5 drivers
-- - 20 tickets (3 with anomalies)
-- - 1 material type
-- - Sample anomalies and exceptions

-- Step 1: Create/Get Organization
DO $$
DECLARE
  org_id uuid;
  site1_id uuid;
  site2_id uuid;
  driver_ids uuid[] := ARRAY[]::uuid[];
  material_id uuid;
  ticket_ids uuid[] := ARRAY[]::uuid[];
  i integer;
BEGIN
  -- Create or get Acme Aggregates organization
  INSERT INTO public.organizations (
    name,
    vertical_type,
    base_plan_active,
    setup_fee_paid,
    truck_count,
    created_at,
    updated_at
  )
  VALUES (
    'Acme Aggregates',
    'aggregates_quarry',
    true,
    true,
    5,
    now() - interval '90 days',
    now()
  )
  ON CONFLICT (name) DO UPDATE
  SET vertical_type = 'aggregates_quarry',
      updated_at = now()
  RETURNING id INTO org_id;

  -- If org already exists, get its ID
  IF org_id IS NULL THEN
    SELECT id INTO org_id FROM public.organizations WHERE name = 'Acme Aggregates' LIMIT 1;
  END IF;

  -- Step 2: Create 2 Quarry Sites (if sites table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN
    -- Site 1: North Quarry
    INSERT INTO public.sites (
      organization_id,
      name,
      address,
      site_type,
      active,
      created_at
    )
    VALUES (
      org_id,
      'North Quarry',
      '123 Quarry Road, North County',
      'quarry',
      true,
      now() - interval '90 days'
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO site1_id;

    IF site1_id IS NULL THEN
      SELECT id INTO site1_id FROM public.sites WHERE organization_id = org_id AND name = 'North Quarry' LIMIT 1;
    END IF;

    -- Site 2: South Quarry
    INSERT INTO public.sites (
      organization_id,
      name,
      address,
      site_type,
      active,
      created_at
    )
    VALUES (
      org_id,
      'South Quarry',
      '456 Aggregate Way, South County',
      'quarry',
      true,
      now() - interval '90 days'
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO site2_id;

    IF site2_id IS NULL THEN
      SELECT id INTO site2_id FROM public.sites WHERE organization_id = org_id AND name = 'South Quarry' LIMIT 1;
    END IF;
  END IF;

  -- Step 3: Create 5 Drivers
  FOR i IN 1..5 LOOP
    DECLARE
      driver_id uuid;
      driver_name text;
    BEGIN
      driver_name := 'Driver ' || i || CASE i WHEN 1 THEN ' (John Smith)' WHEN 2 THEN ' (Mike Johnson)' WHEN 3 THEN ' (Tom Williams)' WHEN 4 THEN ' (Steve Brown)' WHEN 5 THEN ' (Dave Davis)' END;
      
      INSERT INTO public.drivers (
        organization_id,
        name,
        phone,
        email,
        cdl_number,
        status,
        active,
        created_at
      )
      VALUES (
        org_id,
        driver_name,
        '555-000' || i,
        'driver' || i || '@acmeaggregates.com',
        'CDL-' || LPAD(i::text, 6, '0'),
        'Active',
        true,
        now() - interval '180 days'
      )
      ON CONFLICT (cdl_number) DO UPDATE
      SET organization_id = org_id,
          name = driver_name,
          status = 'Active',
          active = true
      RETURNING id INTO driver_id;

      IF driver_id IS NULL THEN
        SELECT id INTO driver_id FROM public.drivers WHERE organization_id = org_id AND cdl_number = 'CDL-' || LPAD(i::text, 6, '0') LIMIT 1;
      END IF;

      driver_ids := array_append(driver_ids, driver_id);
    END;
  END LOOP;

  -- Step 4: Create Material Type (if materials table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'materials') THEN
    INSERT INTO public.materials (
      organization_id,
      name,
      code,
      unit_type,
      active,
      created_at
    )
    VALUES (
      org_id,
      'Crushed Stone',
      'CS-001',
      'Ton',
      true,
      now() - interval '90 days'
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO material_id;

    IF material_id IS NULL THEN
      SELECT id INTO material_id FROM public.materials WHERE organization_id = org_id AND code = 'CS-001' LIMIT 1;
    END IF;
  END IF;

  -- Step 5: Create 20 Tickets (with 3 anomalies)
  -- Normal tickets (17)
  FOR i IN 1..17 LOOP
    DECLARE
      ticket_id uuid;
      ticket_date date;
      quantity numeric;
      pay_rate numeric;
      bill_rate numeric;
      driver_idx integer;
      site_baseline numeric := 22.5; -- Average tons per load
    BEGIN
      ticket_date := CURRENT_DATE - (i * 3);
      driver_idx := ((i - 1) % 5) + 1;
      quantity := site_baseline + (random() * 5 - 2.5); -- Normal variance ±2.5 tons
      pay_rate := 45.00 + (random() * 10 - 5);
      bill_rate := 65.00 + (random() * 10 - 5);

      INSERT INTO public.aggregate_tickets (
        organization_id,
        ticket_number,
        driver_id,
        material_type,
        quantity,
        unit_type,
        pay_rate,
        bill_rate,
        ticket_date,
        status,
        created_at
      )
      VALUES (
        org_id,
        'ACME-' || LPAD(i::text, 6, '0'),
        driver_ids[driver_idx],
        'Crushed Stone',
        quantity,
        'Ton',
        pay_rate,
        bill_rate,
        ticket_date,
        CASE WHEN i <= 10 THEN 'Approved' ELSE 'Pending' END,
        ticket_date
      )
      RETURNING id INTO ticket_id;

      ticket_ids := array_append(ticket_ids, ticket_id);
    END;
  END LOOP;

  -- Anomaly tickets (3)
  -- Ticket 18: Weird net weight (way too high)
  INSERT INTO public.aggregate_tickets (
    organization_id,
    ticket_number,
    driver_id,
    material_type,
    quantity,
    unit_type,
    pay_rate,
    bill_rate,
    ticket_date,
    status,
    created_at
  )
  VALUES (
    org_id,
    'ACME-000018',
    driver_ids[1],
    'Crushed Stone',
    45.8, -- Way above baseline (22.5)
    'Ton',
    45.00,
    65.00,
    CURRENT_DATE - 2,
    'Pending',
    CURRENT_DATE - 2
  )
  RETURNING id INTO ticket_ids[18];

  -- Ticket 19: Long dwell time anomaly
  INSERT INTO public.aggregate_tickets (
    organization_id,
    ticket_number,
    driver_id,
    material_type,
    quantity,
    unit_type,
    pay_rate,
    bill_rate,
    ticket_date,
    status,
    notes,
    created_at
  )
  VALUES (
    org_id,
    'ACME-000019',
    driver_ids[2],
    'Crushed Stone',
    21.2,
    'Ton',
    45.00,
    65.00,
    CURRENT_DATE - 1,
    'Pending',
    'Extended site delay - equipment issue',
    CURRENT_DATE - 1
  )
  RETURNING id INTO ticket_ids[19];

  -- Ticket 20: Low confidence ticket
  INSERT INTO public.aggregate_tickets (
    organization_id,
    ticket_number,
    driver_id,
    material_type,
    quantity,
    unit_type,
    pay_rate,
    bill_rate,
    ticket_date,
    status,
    created_at
  )
  VALUES (
    org_id,
    'ACME-000020',
    driver_ids[3],
    'Crushed Stone',
    8.5, -- Way below baseline
    'Ton',
    45.00,
    65.00,
    CURRENT_DATE,
    'Pending',
    CURRENT_DATE
  )
  RETURNING id INTO ticket_ids[20];

  -- Step 6: Create Sample Anomaly Events (if anomaly_events table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'anomaly_events') THEN
    -- Scale variance anomaly for ticket 18
    INSERT INTO public.anomaly_events (
      entity_type,
      entity_id,
      anomaly_type,
      severity,
      explanation,
      field_name,
      baseline_value,
      actual_value,
      deviation_percentage,
      created_at
    )
    VALUES (
      'ticket',
      ticket_ids[18]::text,
      'scale_variance',
      'high',
      'Net weight (45.8 tons) deviates 103% from site baseline (22.5 tons)',
      'quantity',
      22.5,
      45.8,
      103.6,
      CURRENT_DATE - 2
    )
    ON CONFLICT DO NOTHING;

    -- Dwell time anomaly for ticket 19
    INSERT INTO public.anomaly_events (
      entity_type,
      entity_id,
      anomaly_type,
      severity,
      explanation,
      created_at
    )
    VALUES (
      'ticket',
      ticket_ids[19]::text,
      'dwell_time',
      'medium',
      'Dwell time exceeded site norm by 180% - extended site delay reported',
      CURRENT_DATE - 1
    )
    ON CONFLICT DO NOTHING;

    -- Low confidence anomaly for ticket 20
    INSERT INTO public.anomaly_events (
      entity_type,
      entity_id,
      anomaly_type,
      severity,
      explanation,
      field_name,
      baseline_value,
      actual_value,
      deviation_percentage,
      created_at
    )
    VALUES (
      'ticket',
      ticket_ids[20]::text,
      'low_confidence',
      'high',
      'Net weight (8.5 tons) deviates 62% below site baseline (22.5 tons)',
      'quantity',
      22.5,
      8.5,
      62.2,
      CURRENT_DATE
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Step 7: Create Sample Exception Queue Entries (if exception_queue table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'exception_queue') THEN
    -- Exception for ticket 18 (scale variance)
    INSERT INTO public.exception_queue (
      entity_type,
      entity_id,
      impact_score,
      confidence_score,
      exception_type,
      severity,
      explanation,
      recommended_action,
      status,
      created_at
    )
    VALUES (
      'ticket',
      ticket_ids[18]::uuid,
      1250.00, -- Impact based on ticket value
      0.3, -- Low confidence
      'scale_variance',
      'high',
      'Net weight deviates 103% from site baseline - potential scale error',
      'Review scale ticket and verify actual weight with site',
      'open',
      CURRENT_DATE - 2
    )
    ON CONFLICT DO NOTHING;

    -- Exception for ticket 19 (dwell time)
    INSERT INTO public.exception_queue (
      entity_type,
      entity_id,
      impact_score,
      confidence_score,
      exception_type,
      severity,
      explanation,
      recommended_action,
      status,
      created_at
    )
    VALUES (
      'ticket',
      ticket_ids[19]::uuid,
      650.00,
      0.7,
      'dwell_time',
      'medium',
      'Extended site delay - efficiency impact',
      'Review site conditions and driver notes',
      'open',
      CURRENT_DATE - 1
    )
    ON CONFLICT DO NOTHING;

    -- Exception for ticket 20 (low confidence)
    INSERT INTO public.exception_queue (
      entity_type,
      entity_id,
      impact_score,
      confidence_score,
      exception_type,
      severity,
      explanation,
      recommended_action,
      status,
      created_at
    )
    VALUES (
      'ticket',
      ticket_ids[20]::uuid,
      950.00,
      0.25,
      'low_confidence',
      'high',
      'Net weight significantly below baseline - potential data error',
      'Request driver clarification and verify ticket',
      'open',
      CURRENT_DATE
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE 'Demo org "Acme Aggregates" seeded successfully with org_id: %', org_id;
END $$;

-- Comments
COMMENT ON TABLE public.organizations IS 
  'Demo org "Acme Aggregates" seeded with 2 sites, 5 drivers, 20 tickets (3 anomalies)';
