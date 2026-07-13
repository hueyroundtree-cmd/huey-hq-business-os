BEGIN;

-- Import safe new leads produced by the existing GFL Daily Lead Agent / Vibe prospecting outputs.
-- Data-only import into the existing Command Center CRM.
-- Guardrails:
-- - Do not alter the agent, CRM workflow, schema, dashboards, automations, or lead systems.
-- - Do not overwrite verified information on existing leads.
-- - Do not mark any imported lead as Contacted.
-- - Do not create sent-email activity.
-- - Keep Zoho composer behavior manual: Huey reviews and sends.

DO $$
DECLARE
  v_candidate_count INTEGER := 0;
  v_inserted_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
BEGIN
  WITH incoming (
    crm_id,
    contact_name,
    company,
    role,
    industry,
    phone,
    email,
    city,
    website_url,
    profile_url,
    source_record_id,
    lead_source,
    priority,
    date_found,
    source_notes
  ) AS (
    VALUES
      (
        'GFLDA-20260624-001',
        'Ron Leavitt',
        'Amerit Fleet Solutions',
        'Fleet manager',
        'Automotive Repair and Maintenance',
        '+17046066837',
        'rleavitt@ameritfleet.com',
        'California',
        'https://ameritfleetsolutions.com',
        'https://linkedin.com/in/ACoAACcIFGYBnrXbZkzdvFcf6PnPC2DxMvGOgUk',
        'vibe-prospect:5ab09733a45f00883bf8cd77ea4ae68a764e2e98',
        'GFL Daily Lead Agent - Vibe Prospecting',
        'High',
        '2026-06-24'::date,
        'Business ID: 0608d16df7f6c81492bc306ae98fc704'
      ),
      (
        'GFLDA-20260624-002',
        'Darren Young',
        'Amerit Fleet Solutions',
        'Fleet manager',
        'Automotive Repair and Maintenance',
        '+12097521015',
        'dyoung@ameritfleet.com',
        'California',
        'https://ameritfleetsolutions.com',
        'https://linkedin.com/in/ACoAAC7uz-YBzM6wz0fQIWhoGgB5xVpocuXLmLQ',
        'vibe-prospect:334e613adbe36b59fbaef447b50e1cd2b9459341',
        'GFL Daily Lead Agent - Vibe Prospecting',
        'High',
        '2026-06-24'::date,
        'Business ID: 0608d16df7f6c81492bc306ae98fc704'
      ),
      (
        'GFLDA-20260624-003',
        'Zekerijah Mehmedagic',
        'Amerit Fleet Solutions',
        'Fleet manager',
        'Automotive Repair and Maintenance',
        '+15619062976',
        'zekerijah.mehmedagic@ameritfleetsolutions.com',
        'California',
        'https://ameritfleetsolutions.com',
        'https://linkedin.com/in/ACoAAEI8ZMMB1_mVgDcfHaWnHovDT-V-R4buNCk',
        'vibe-prospect:8f3123ac9799f05edec850cbb78b9df8f2a80063',
        'GFL Daily Lead Agent - Vibe Prospecting',
        'High',
        '2026-06-24'::date,
        'Business ID: 0608d16df7f6c81492bc306ae98fc704'
      ),
      (
        'GFLDA-20260624-004',
        'Shaun Wood',
        'Amerit Fleet Solutions',
        'Fleet manager',
        'Automotive Repair and Maintenance',
        '+17173050250',
        'shaun.w@ameritfleetsolutions.com',
        'California',
        'https://ameritfleetsolutions.com',
        'https://linkedin.com/in/ACoAAB4z9rkBHvmuntSFu-HbAQXKWjeOxgplGgE',
        'vibe-prospect:dda82c7f52318c12d238d90d1323b25093a33dc6',
        'GFL Daily Lead Agent - Vibe Prospecting',
        'High',
        '2026-06-24'::date,
        'Business ID: 0608d16df7f6c81492bc306ae98fc704'
      ),
      (
        'GFLDA-20260624-005',
        'Scott Russell',
        'Amerit Fleet Solutions',
        'Fleet manager',
        'Automotive Repair and Maintenance',
        NULL,
        'scott.russell@ameritfleetsolutions.com',
        'California',
        'https://ameritfleetsolutions.com',
        'https://linkedin.com/in/ACoAADdMwc4B5zZLYPQ88X4-G4ucQZ-keOerV_A',
        'vibe-prospect:2c7594b667b554e6c619887f7612151b722209eb',
        'GFL Daily Lead Agent - Vibe Prospecting',
        'Medium',
        '2026-06-24'::date,
        'Business ID: 0608d16df7f6c81492bc306ae98fc704; phone missing in source'
      ),
      (
        'GFLDA-20260625-001',
        'Amir Ghorbani',
        'Swoop',
        'Chief Executive Officer',
        'Limo / Fleet Transportation',
        '+13109235555',
        'amir@moovsapp.com',
        'Sacramento',
        'https://swoopapp.com',
        'https://linkedin.com/in/amirghorbani',
        'drive-b2b-limo-fleet-20260625:amir@moovsapp.com',
        'GFL Daily Lead Agent - B2B Prospects',
        'High',
        '2026-06-25'::date,
        'Drive sheet: Great Freight Detailing - B2B Prospects (Limo & Fleet) June 2026; full export: https://share.explorium.ai/rPynoY'
      ),
      (
        'GFLDA-20260625-002',
        'Jay B',
        'MGL Limo Worldwide Executive Black Car',
        'Chief Executive Officer',
        'Limo / Fleet Transportation',
        '+14156993138',
        'jay@mgllimo.com',
        'San Francisco Bay Area',
        'https://mgllimo.com',
        'https://linkedin.com/in/jay-b-464594111',
        'drive-b2b-limo-fleet-20260625:jay@mgllimo.com',
        'GFL Daily Lead Agent - B2B Prospects',
        'High',
        '2026-06-25'::date,
        'Drive sheet: Great Freight Detailing - B2B Prospects (Limo & Fleet) June 2026; duplicate Jay/MGL row in source intentionally skipped by using one canonical row'
      ),
      (
        'GFLDA-20260625-003',
        'Dave Uziel',
        'Urban Worldwide',
        'Chief Executive Officer',
        'Limo / Fleet Transportation',
        NULL,
        'duziel@urbanbcn.com',
        'San Bruno',
        'https://urbanworldwide.com',
        'https://linkedin.com/in/daveuziel',
        'drive-b2b-limo-fleet-20260625:duziel@urbanbcn.com',
        'GFL Daily Lead Agent - B2B Prospects',
        'Medium',
        '2026-06-25'::date,
        'Drive sheet: Great Freight Detailing - B2B Prospects (Limo & Fleet) June 2026; duplicate Dave/Urban row in source intentionally skipped by using one canonical row'
      ),
      (
        'GFLDA-20260625-004',
        'Ali M',
        'Luxury Motors',
        'CEO / Founder',
        'Automotive / Fleet Transportation',
        '+19495422302',
        'ali@luxmotorsoc.com',
        'Irvine',
        'https://luxmotorsoc.com',
        'https://linkedin.com/in/theofficialalim',
        'drive-b2b-limo-fleet-20260625:ali@luxmotorsoc.com',
        'GFL Daily Lead Agent - B2B Prospects',
        'Medium',
        '2026-06-25'::date,
        'Drive sheet: Great Freight Detailing - B2B Prospects (Limo & Fleet) June 2026; California automotive prospect, outside core Bay Area'
      )
  ),
  prepared AS (
    SELECT
      i.*,
      split_part(i.contact_name, ' ', 1) AS first_name,
      COALESCE(NULLIF(i.profile_url, ''), NULLIF(i.website_url, '')) AS source_url_value,
      format('Keeping Your Fleet Clean - Great Freight Detailing') AS email_subject_value,
      format($email$Hi %s,

My name is Huey Roundtree - I run Great Freight Detailing, a mobile auto detailing service covering the Bay Area.

I work with dealerships, fleet managers, limo services, and operations teams who need their vehicles looking sharp without pulling them off-site. We come to you.

Quick numbers:
- Express Detail: $100
- Standard Detail: $175
- Premium Full Detail: $300
- Fleet pricing available for 3+ vehicles

No shop. No drop-off. We come to your location.

Would it make sense to connect this week? Happy to do a complimentary test detail on one vehicle so you can see the quality firsthand.

- Huey Roundtree
Great Freight Detailing | Bay Area
(323) 989-4510
https://gfldetailcom.lovable.app$email$, split_part(i.contact_name, ' ', 1)) AS email_body_value,
      format($text$Hi %s, this is Huey with Great Freight Detailing. I help fleets, limo services, dealerships, and local businesses keep vehicles clean without sending them to a shop. We come to your location, and services start at $100. If you have vehicles that need regular cleaning, I can quote a one-time detail or simple maintenance plan. - Huey, (323) 989-4510$text$, split_part(i.contact_name, ' ', 1)) AS text_template_value,
      format(
        'Role: %s
Industry: %s
Website: %s
Profile URL: %s
Source Record ID: %s
Lead Source: %s
Date Found: %s
Imported from existing GFL Daily Lead Agent output.
Contacted: No
Source notes: %s',
        i.role,
        i.industry,
        COALESCE(i.website_url, ''),
        COALESCE(i.profile_url, ''),
        i.source_record_id,
        i.lead_source,
        i.date_found::text,
        COALESCE(i.source_notes, '')
      ) AS notes_value
    FROM incoming i
    WHERE
      NULLIF(i.contact_name, '') IS NOT NULL
      AND NULLIF(i.company, '') IS NOT NULL
      AND (
        NULLIF(i.email, '') IS NOT NULL
        OR NULLIF(i.phone, '') IS NOT NULL
        OR NULLIF(i.profile_url, '') IS NOT NULL
        OR NULLIF(i.website_url, '') IS NOT NULL
      )
  ),
  target_users AS (
    SELECT id
    FROM public.profiles
  ),
  inserted AS (
    INSERT INTO public.leads (
      user_id,
      crm_id,
      name,
      business,
      phone,
      email,
      source,
      source_record_id,
      source_url,
      industry,
      city,
      priority,
      verification_source,
      date_added,
      lead_type,
      business_unit_id,
      estimated_value,
      status,
      outreach_status,
      zoho_email_sent,
      email_subject,
      email_body,
      text_message_template,
      contact_method,
      next_action,
      service_needed,
      deposit_status,
      appointment_status,
      lead_score,
      notes
    )
    SELECT
      tu.id,
      p.crm_id,
      p.contact_name,
      p.company,
      p.phone,
      p.email,
      p.lead_source,
      p.source_record_id,
      p.source_url_value,
      p.industry,
      p.city,
      p.priority,
      'Existing GFL Daily Lead Agent / Vibe Prospecting export',
      p.date_found,
      'Detailing',
      '11111111-1111-4111-8111-111111111111',
      100,
      'New Lead',
      'Ready to Send',
      false,
      p.email_subject_value,
      p.email_body_value,
      p.text_template_value,
      CASE
        WHEN p.email IS NOT NULL THEN 'Email'
        WHEN p.phone IS NOT NULL THEN 'Text'
        ELSE 'Manual Review'
      END,
      'Review personalized script and send manually in Zoho',
      'Mobile detailing for fleet, limo, dealership, or local business vehicles',
      'Not Requested',
      'Not Scheduled',
      CASE WHEN p.priority = 'High' THEN 85 ELSE 65 END,
      p.notes_value
    FROM target_users tu
    CROSS JOIN prepared p
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.leads l
      WHERE l.user_id = tu.id
        AND (
          (p.source_record_id IS NOT NULL AND l.source_record_id IS NOT NULL AND l.source_record_id = p.source_record_id)
          OR (p.email IS NOT NULL AND l.email IS NOT NULL AND lower(l.email) = lower(p.email))
          OR (
            regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g') <> ''
            AND regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g') = regexp_replace(COALESCE(p.phone, ''), '\D', '', 'g')
          )
          OR (
            p.source_url_value IS NOT NULL
            AND l.source_url IS NOT NULL
            AND lower(l.source_url) = lower(p.source_url_value)
          )
          OR (
            lower(COALESCE(l.business, '')) = lower(p.company)
            AND lower(COALESCE(l.name, '')) = lower(p.contact_name)
          )
        )
    )
    RETURNING id
  )
  SELECT
    (SELECT count(*) FROM target_users) * (SELECT count(*) FROM prepared),
    (SELECT count(*) FROM inserted)
  INTO v_candidate_count, v_inserted_count;

  v_skipped_count := v_candidate_count - v_inserted_count;

  RAISE NOTICE 'GFL Daily Lead Agent import complete: candidates=%, inserted=%, skipped_existing_or_duplicate=%',
    v_candidate_count,
    v_inserted_count,
    v_skipped_count;
END $$;

COMMIT;
