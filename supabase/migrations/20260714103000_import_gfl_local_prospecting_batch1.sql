BEGIN;

-- Import GFL Local Prospecting Batch 1 from:
-- GFL_Local_Prospecting_Batch1_2026-07-13 - Batch 1.pdf
--
-- Data-only import into the existing Command Center CRM.
-- Guardrails:
-- - Do not create a second CRM.
-- - Do not auto-send emails or texts.
-- - Do not mark leads Contacted.
-- - Preserve the existing pipeline and schema.
-- - Dedupe by source record ID, phone, source URL, or business + contact name.

DO $$
DECLARE
  v_candidate_count INTEGER := 0;
  v_inserted_count INTEGER := 0;
  v_updated_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
BEGIN
  CREATE TABLE IF NOT EXISTS public.crm_backup_before_balf_batch1_20260714 AS
  SELECT * FROM public.leads WITH NO DATA;

  ALTER TABLE public.crm_backup_before_balf_batch1_20260714 ENABLE ROW LEVEL SECURITY;

  INSERT INTO public.crm_backup_before_balf_batch1_20260714
  SELECT *
  FROM public.leads
  ON CONFLICT DO NOTHING;

  WITH incoming (
    lead_id,
    contact_name,
    company,
    role,
    industry,
    city,
    contact_method,
    phone,
    website_url,
    research_source,
    verification_note,
    priority,
    prospect_status
  ) AS (
    VALUES
      ('BALF2-001','Office Team','Ross Company Realtors','Realtor/Broker','Real Estate','Martinez','Needs Contact Info','(925) 372-8400',NULL,'Yelp business listing','Phone verified via Yelp business listing, 928 Main St, Martinez, CA 94553','Standard','New Lead'),
      ('BALF2-002','Office Team','Snyder Real Estate Group','Realtor/Broker','Real Estate','Martinez','Needs Contact Info','(925) 518-6461',NULL,'Yelp business listing','Phone verified via Yelp business listing, 728 Main St, Martinez, CA 94553','Standard','New Lead'),
      ('BALF2-003','Michelle Allman','State Farm Insurance - Michelle Allman','Insurance Agent','Insurance','Martinez','Needs Contact Info','(925) 228-0920','https://statefarm.com/agent/us/ca/martinez/michelle-allman-cqws41ys000','State Farm official agent directory','Phone and agent identity verified on statefarm.com agent page','Warm','New Lead'),
      ('BALF2-004','Kathy Bernardez','State Farm Insurance - Kathy Bernardez','Insurance Agent','Insurance','Martinez','Needs Contact Info','(925) 520-0290','https://statefarm.com/agent/us/ca/martinez/kathy-bernardez-4l0z96pkpal','State Farm official agent directory','Phone and agent identity verified on statefarm.com agent page','Warm','New Lead'),
      ('BALF2-005','Sam Limones','State Farm Insurance - Sam Limones','Insurance Agent','Insurance','Martinez','Needs Contact Info','(925) 944-9316','https://statefarm.com/agent/us/ca/martinez/sam-limones-p1kls1ys000','State Farm official agent directory','Phone and agent identity verified on statefarm.com agent page','Warm','New Lead'),
      ('BALF2-006','Office Team','Castle Management','Property Manager','Property Management','Pittsburg','Needs Contact Info','(925) 328-1240','https://castlemanagement.com','Company website','Phone verified on castlemanagement.com','Standard','New Lead'),
      ('BALF2-007','Office Team','Inner Circle Property Management','Property Manager','Property Management','Pittsburg','Needs Contact Info','(925) 392-8926','https://innercirclepropertymanagement.com','Company website','Phone verified on innercirclepropertymanagement.com','Standard','New Lead'),
      ('BALF2-008','Office Team','Property Upsurge','Property Manager','Property Management','Pittsburg','Needs Contact Info','(925) 363-5328','https://propertyupsurge.com','Yelp + company website','Phone verified via Yelp listing, 501 Railroad Ave, Pittsburg, CA','Standard','New Lead'),
      ('BALF2-009','Office Team','Croskey Real Estate / Croskey PM','Property Manager','Property Management','Pittsburg','Needs Contact Info','(925) 336-3282','https://croskeypm.com','Company website','Phone verified on croskeypm.com, serves Pittsburg/East County','Standard','New Lead'),
      ('BALF2-010','Jocelyn Lawson','Wells Fargo Home Mortgage - Jocelyn Lawson','Mortgage Consultant','Mortgage / Lending','Antioch','Needs Contact Info','(925) 565-3755','https://homeloans.wellsfargo.com/mortgage/ca/antioch/jocelyn-lawson','Wells Fargo official site','Phone and identity verified on homeloans.wellsfargo.com','Warm','New Lead'),
      ('BALF2-011','Michelle Paxton','Guild Mortgage - Michelle Paxton','Loan Officer','Mortgage / Lending','Antioch','Needs Contact Info','(408) 891-0090','https://guildmortgage.com','Nextdoor business listing + Guild Mortgage','Address verified: 5829 Lone Tree Way, Antioch, CA 94531','Warm','New Lead'),
      ('BALF2-012','Martin T. Gonsalves','Law Office of Martin T. Gonsalves','Attorney','Attorney (Real Estate/Probate)','Antioch','Needs Contact Info','(925) 234-4340','https://rivertownlegal.com','Company website','Phone and practice area verified on rivertownlegal.com','Standard','New Lead'),
      ('BALF2-013','Joel A. Harris','Law Offices of Joel A. Harris','Attorney','Attorney','Antioch','Needs Contact Info','(925) 757-4605',NULL,'LawInfo directory listing','Phone and address verified via LawInfo, 511 W. Third St, Antioch, CA 94509','Standard','New Lead'),
      ('BALF2-014','Office Team','W Real Estate Napa','Realtor/Broker','Real Estate','Napa','Needs Contact Info','(707) 226-2661','https://wrealestate.net','Company website','Phone and address verified on wrealestate.net, 1700 Soscol Ave Ste 3, Napa, CA 94559','Standard','New Lead'),
      ('BALF2-015','Office Team','Coldwell Banker Brokers of the Valley','Realtor/Broker','Real Estate','Napa','Needs Contact Info','(707) 258-5200','https://coldwellbanker.com','Company website','Phone verified on coldwellbanker.com office page','Standard','New Lead'),
      ('BALF2-016','Office Team','Windermere Napa','Realtor/Broker','Real Estate','Napa','Needs Contact Info','(707) 226-1823','https://windermere.com','Company website','Phone verified on windermere.com office directory','Standard','New Lead'),
      ('BALF2-017','Office Team','Ameriprise Financial Advisors (Napa)','Financial Advisor','Financial Advisor','Napa','Needs Contact Info',NULL,NULL,'Yelp business listing','Address verified via Yelp (1754 2nd St, Napa, CA) - no direct phone published; contact via office visit or Yelp message until a public number is confirmed','Low','New Lead'),
      ('BALF2-018','Kathy Krohn','State Farm Insurance - Kathy Krohn','Insurance Agent','Insurance','Vacaville','Needs Contact Info','(707) 451-7422','https://statefarm.com/agent/us/ca/vacaville/kathy-krohn-7m9yp1ys000','State Farm official agent directory + Yelp','Phone verified on statefarm.com, 438 Main St, Vacaville, CA','Warm','New Lead'),
      ('BALF2-019','Barbara Lightfoot-Nielsen','State Farm Insurance - Barbara Lightfoot-Nielsen','Insurance Agent','Insurance','Vacaville','Needs Contact Info','(707) 449-4184','https://statefarm.com/agent/us/ca/vacaville/barbara-lightfoot-nielsen-rvtx31ys000','State Farm official agent directory','Phone and agent identity verified on statefarm.com agent page','Warm','New Lead'),
      ('BALF2-020','Office Team','Navigate Real Estate - Vacaville Office','Realtor/Broker','Real Estate','Vacaville','Needs Contact Info','(707) 653-6631','https://navigatere.com','Company website','Phone verified on navigatere.com/vacaville-office','Standard','New Lead'),
      ('BALF2-021','Office Team','Intero Real Estate - Vacaville','Realtor/Broker','Real Estate','Vacaville','Needs Contact Info','(707) 446-9600','https://intero.com','Company website','Phone and address verified on intero.com, 555 Mason St Ste 230, Vacaville, CA 95688','Standard','New Lead'),
      ('BALF2-022','Office Team','Chandler Properties','Realtor/Broker','Real Estate','Vacaville','Needs Contact Info','(707) 449-9852',NULL,'Yelp business listing','Phone and address verified via Yelp, 331 Main St Ste D, Vacaville, CA 95688','Standard','New Lead'),
      ('BALF2-023','Office Team','C & C Property Management','Property Manager','Property Management','Vacaville','Needs Contact Info','(707) 447-6088',NULL,'Yelp business listing','Phone and address verified via Yelp, 500 Merchant St, Vacaville, CA','Standard','New Lead'),
      ('BALF2-024','Office Team','Commonwealth Realty & Property Management','Property Manager','Property Management','Vacaville','Needs Contact Info','(707) 447-4807',NULL,'Yelp business listing','Phone and address verified via Yelp, 400 Boyd St, Vacaville, CA','Standard','New Lead'),
      ('BALF2-025','Office Team','Solano Property Management','Property Manager','Property Management','Vacaville','Needs Contact Info','(707) 447-8501','https://facebook.com/SolanoPM','Facebook business page','Phone verified via official Facebook business page','Standard','New Lead')
  ),
  prepared AS (
    SELECT
      i.*,
      split_part(i.contact_name, ' ', 1) AS first_name,
      CASE
        WHEN i.priority = 'Warm' THEN 80
        WHEN i.priority = 'Standard' THEN 65
        ELSE 45
      END AS lead_score_value,
      CASE
        WHEN i.industry ILIKE '%Real Estate%' THEN 'Mobile detailing for real estate professionals'
        WHEN i.industry ILIKE '%Insurance%' THEN 'Mobile detailing for insurance professionals'
        WHEN i.industry ILIKE '%Property%' THEN 'Mobile detailing for property management vehicles'
        WHEN i.industry ILIKE '%Mortgage%' THEN 'Mobile detailing for mortgage and lending professionals'
        WHEN i.industry ILIKE '%Attorney%' THEN 'Mobile detailing for local professional offices'
        WHEN i.industry ILIKE '%Financial%' THEN 'Mobile detailing for financial professionals'
        ELSE 'Mobile detailing for local Bay Area professionals'
      END AS service_needed_value,
      CASE
        WHEN i.industry ILIKE '%Real Estate%' THEN format('Mobile detailing for %s', i.company)
        WHEN i.industry ILIKE '%Insurance%' THEN format('Mobile detailing for %s', i.company)
        WHEN i.industry ILIKE '%Property%' THEN format('Mobile detailing for %s', i.company)
        ELSE format('Great Freight Mobile Detailing introduction for %s', i.company)
      END AS email_subject_value,
      format($email$Hi %s,

My name is Huey Roundtree, owner of Great Freight Mobile Detailing. I found %s while building a local Bay Area prospect list for professionals and businesses that may benefit from convenient mobile detailing.

We come directly to your office, property, or home, so your vehicle can stay clean and professional without needing a shop drop-off. Services start at $100, and we serve Bay Area / Northern California communities.

If this would be useful for you or your team, I can send over a simple quote or booking link.

Website: https://gfldetail.com
Booking: https://bay-area-102518.square.site

Thank you,
Huey Roundtree III
Great Freight Mobile Detailing
(323) 989-4510$email$, split_part(i.contact_name, ' ', 1), i.company) AS email_body_value,
      format($text$Hi %s, this is Huey with Great Freight Detailing. I found %s while putting together a local Bay Area prospect list. We provide mobile detailing at your office, property, or home, and services start at $100. You can learn more at https://gfldetail.com. Thank you.$text$, split_part(i.contact_name, ' ', 1), i.company) AS text_template_value,
      format(
        'Role: %s
Industry: %s
Contact method from source: %s
Research source: %s
Verification note: %s
Imported from GFL_Local_Prospecting_Batch1_2026-07-13 - Batch 1.pdf.
Contacted: No
Auto-send: No
Next step: Find public email/contact form if missing, then Huey reviews and sends manually.',
        i.role,
        i.industry,
        i.contact_method,
        i.research_source,
        i.verification_note
      ) AS notes_value
    FROM incoming i
  ),
  target_users AS (
    SELECT id
    FROM public.profiles
  ),
  updated AS (
    UPDATE public.leads l
    SET
      crm_id = COALESCE(l.crm_id, p.lead_id),
      name = COALESCE(NULLIF(l.name, ''), p.contact_name),
      business = COALESCE(l.business, p.company),
      phone = COALESCE(l.phone, p.phone),
      source = CASE
        WHEN l.source IS NULL OR l.source = '' THEN 'Bay Area Lead Finder - Batch 1'
        WHEN l.source NOT ILIKE '%Bay Area Lead Finder - Batch 1%' THEN l.source || ' | Bay Area Lead Finder - Batch 1'
        ELSE l.source
      END,
      source_record_id = COALESCE(l.source_record_id, p.lead_id),
      source_url = COALESCE(l.source_url, p.website_url),
      industry = COALESCE(l.industry, p.industry),
      city = COALESCE(l.city, p.city),
      priority = COALESCE(l.priority, p.priority),
      verification_source = COALESCE(l.verification_source, p.research_source),
      date_added = COALESCE(l.date_added, '2026-07-13'::date),
      lead_type = 'Detailing',
      business_unit_id = COALESCE(l.business_unit_id, '11111111-1111-4111-8111-111111111111'),
      estimated_value = COALESCE(l.estimated_value, 100),
      status = CASE WHEN l.status IS NULL THEN 'New Lead'::public.lead_status ELSE l.status END,
      outreach_status = COALESCE(l.outreach_status, 'Needs Contact Info'),
      zoho_email_sent = COALESCE(l.zoho_email_sent, false),
      email_subject = COALESCE(l.email_subject, p.email_subject_value),
      email_body = COALESCE(l.email_body, p.email_body_value),
      text_message_template = COALESCE(l.text_message_template, p.text_template_value),
      contact_method = COALESCE(l.contact_method, CASE WHEN p.phone IS NOT NULL THEN 'Phone / Manual Research' ELSE 'Manual Research' END),
      next_action = COALESCE(l.next_action, 'Find public email/contact form, then send personalized introduction'),
      service_needed = COALESCE(l.service_needed, p.service_needed_value),
      deposit_status = COALESCE(l.deposit_status, 'Not Requested'),
      appointment_status = COALESCE(l.appointment_status, 'Not Scheduled'),
      lead_score = COALESCE(l.lead_score, p.lead_score_value),
      notes = CASE
        WHEN COALESCE(l.notes, '') ILIKE '%Imported from GFL_Local_Prospecting_Batch1_2026-07-13 - Batch 1.pdf%' THEN l.notes
        ELSE trim(COALESCE(l.notes, '') || CASE WHEN COALESCE(l.notes, '') = '' THEN '' ELSE E'\n\n' END || p.notes_value)
      END,
      updated_at = now()
    FROM prepared p
    WHERE
      l.user_id IN (SELECT id FROM target_users)
      AND (
        (l.source_record_id IS NOT NULL AND l.source_record_id = p.lead_id)
        OR (
          regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g') <> ''
          AND regexp_replace(COALESCE(p.phone, ''), '\D', '', 'g') <> ''
          AND regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g') = regexp_replace(COALESCE(p.phone, ''), '\D', '', 'g')
        )
        OR (
          p.website_url IS NOT NULL
          AND l.source_url IS NOT NULL
          AND lower(l.source_url) = lower(p.website_url)
        )
        OR (
          lower(COALESCE(l.business, '')) = lower(p.company)
          AND lower(COALESCE(l.name, '')) = lower(p.contact_name)
        )
      )
    RETURNING l.id
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
      p.lead_id,
      p.contact_name,
      p.company,
      p.phone,
      NULL,
      'Bay Area Lead Finder - Batch 1',
      p.lead_id,
      p.website_url,
      p.industry,
      p.city,
      p.priority,
      p.research_source,
      '2026-07-13'::date,
      'Detailing',
      '11111111-1111-4111-8111-111111111111',
      100,
      'New Lead',
      'Needs Contact Info',
      false,
      p.email_subject_value,
      p.email_body_value,
      p.text_template_value,
      CASE WHEN p.phone IS NOT NULL THEN 'Phone / Manual Research' ELSE 'Manual Research' END,
      'Find public email/contact form, then send personalized introduction',
      p.service_needed_value,
      'Not Requested',
      'Not Scheduled',
      p.lead_score_value,
      p.notes_value
    FROM target_users tu
    CROSS JOIN prepared p
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.leads l
      WHERE l.user_id = tu.id
        AND (
          (l.source_record_id IS NOT NULL AND l.source_record_id = p.lead_id)
          OR (
            regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g') <> ''
            AND regexp_replace(COALESCE(p.phone, ''), '\D', '', 'g') <> ''
            AND regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g') = regexp_replace(COALESCE(p.phone, ''), '\D', '', 'g')
          )
          OR (
            p.website_url IS NOT NULL
            AND l.source_url IS NOT NULL
            AND lower(l.source_url) = lower(p.website_url)
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
    (SELECT count(*) FROM inserted),
    (SELECT count(*) FROM updated)
  INTO v_candidate_count, v_inserted_count, v_updated_count;

  v_skipped_count := v_candidate_count - v_inserted_count - v_updated_count;

  RAISE NOTICE 'GFL Local Prospecting Batch 1 import complete: candidates=%, inserted=%, updated=%, skipped_existing_or_duplicate=%',
    v_candidate_count,
    v_inserted_count,
    v_updated_count,
    v_skipped_count;
END $$;

COMMIT;
