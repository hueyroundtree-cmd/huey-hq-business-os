BEGIN;

-- Import GFL Local Prospecting Batch 2 from:
-- GFL_Local_Prospecting_Batch2_2026-07-13.xlsx
--
-- Data-only import into the existing Command Center CRM.
-- Guardrails:
-- - Do not create a second CRM.
-- - Do not auto-send emails or texts.
-- - Do not mark leads Contacted.
-- - Preserve the existing pipeline and schema.
-- - Dedupe by source record ID, email, phone, source URL, or business + contact name.

DO $$
DECLARE
  v_candidate_count INTEGER := 0;
  v_inserted_count INTEGER := 0;
  v_updated_count INTEGER := 0;
BEGIN
  CREATE TABLE IF NOT EXISTS public.crm_backup_before_balf_batch2_20260715 AS
  SELECT * FROM public.leads WITH NO DATA;

  ALTER TABLE public.crm_backup_before_balf_batch2_20260715 ENABLE ROW LEVEL SECURITY;

  INSERT INTO public.crm_backup_before_balf_batch2_20260715
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
    source_contact_method,
    email,
    phone,
    website_url,
    research_source,
    verification_note,
    priority,
    prospect_status
  ) AS (
    VALUES
      ('BALF3-001','Office Team','RE/MAX Accord — Pleasant Hill Office','Realtor/Broker','Real Estate','Pleasant Hill','Needs Contact Info',NULL,'(925) 826-5775','https://remaxaccord.com/office/pleasant-hill','Company website','Phone + address verified on remaxaccord.com, 367 Civic Dr Ste 7, Pleasant Hill, CA 94523; office email was redacted in every source, not usable','Standard','New Lead'),
      ('BALF3-002','Christine Sampson','State Farm Insurance — Christine Sampson','Insurance Agent','Insurance','Pleasant Hill','Needs Contact Info',NULL,'(925) 685-9752','https://statefarm.com/agent/us/ca/pleasant-hill/christine-sampson-q7h5v1ys000','State Farm official agent directory + Yelp','Phone + agent identity verified on statefarm.com, 1924 Oak Park Blvd Ste C, Pleasant Hill, CA 94523; no public email listed','Warm','New Lead'),
      ('BALF3-003','Office Team','Stokley Properties','Property Manager','Property Management','Pleasant Hill','Needs Contact Info',NULL,'(925) 658-1415','https://stokleyproperties.net','Company website + Pleasant Hill Chamber directory','Phone verified on stokleyproperties.net and business.pleasanthillchamber.com; no public email listed','Standard','New Lead'),
      ('BALF3-004','Office Team','Edrington, Schirmer & Murphy LLP','Attorney','Attorney','Pleasant Hill','Needs Contact Info',NULL,'(925) 827-3300','https://esmlawfirm.com','Company website','Phone + address verified on esmlawfirm.com, 2300 Contra Costa Blvd Ste 450, Pleasant Hill, CA 94523; no public email listed','Standard','New Lead'),
      ('BALF3-005','Office Team','KCK Construction','Contractor','Contractor','Pleasant Hill','kckconstructionr@gmail.com','kckconstructionr@gmail.com','510-978-3259',NULL,'Yelp business listing','Email + phone + address verified via Yelp, 3330 Vincent Rd Ste H, Pleasant Hill, CA 94523','Standard','New Lead'),
      ('BALF3-006','Office Team','Rhone Law, A.P.C.','Attorney','Attorney (Family Law)','Benicia','cgr@rhone-law.com','cgr@rhone-law.com','(707) 400-0691','https://rhonefamilylaw.com','Company website (rhonefamilylaw.com/contact)','Email + phone + address verified on rhonefamilylaw.com, 801 1st St Ste B, Benicia, CA 94510','Standard','New Lead'),
      ('BALF3-007','Office Team','Law Offices of Barnum & Avila','Attorney','Attorney','Benicia','Needs Contact Info',NULL,'(707) 745-3747','https://rmblaw.com','Company website','Phone + address verified on rmblaw.com, 279 East H St, Benicia, CA 94510; no public email listed','Standard','New Lead'),
      ('BALF3-008','Office Team','Hethco Services, LLC','Contractor','Contractor','Benicia','hethcoservices@gmail.com','hethcoservices@gmail.com','707-654-9464','https://hethcoservices.com','Company website','Email + phone verified on hethcoservices.com service-area page for Benicia','Standard','New Lead'),
      ('BALF3-009','Dr. Meade','Meade Family Dental','Dentist','Medical & Dental','Benicia','meade1440@gmail.com','meade1440@gmail.com','(707) 745-2121','https://benicia.dental','Company website (benicia.dental/contact)','Email + phone + address verified on benicia.dental, 1440 Military West Ste 102, Benicia, CA 94510','Standard','New Lead'),
      ('BALF3-010','Robert Wells','Law Office of Robert M. Wells','Attorney','Attorney','Vallejo','Needs Contact Info',NULL,'(707) 653-5187',NULL,'Vallejo Chamber of Commerce directory','Phone + address verified via vallejochamber.com, 769 Tuolumne St, Vallejo, CA 94590; no public email listed','Standard','New Lead'),
      ('BALF3-011','Richard','Rumsey Construction','Contractor','Contractor','Vallejo','richard@rumseyconstruction.com','richard@rumseyconstruction.com','(916) 407-8478','https://rumseyconstruction.com','Company website (rumseyconstruction.com/vallejo)','Email + phone verified on rumseyconstruction.com','Standard','New Lead'),
      ('BALF3-012','James','JWD Builders','Contractor','Contractor','Vallejo','james@jwdbuilders.com','james@jwdbuilders.com','(707) 704-9919','https://jwdbuilders.com','Company website (jwdbuilders.com/contact)','Email + phone verified on jwdbuilders.com','Standard','New Lead'),
      ('BALF3-013','Office Team','Vallejo Family Dentistry','Dentist','Medical & Dental','Vallejo','vfd@vfddds.net','vfd@vfddds.net','707-557-2200','https://myvallejodentist.com','Company website (myvallejodentist.com/contact)','Email + phone + address verified on myvallejodentist.com, 23 Rotary Way, Vallejo, CA 94591','Standard','New Lead'),
      ('BALF3-014','Office Team','Scalise Law Office','Attorney','Attorney (Family Law)','Fairfield','Needs Contact Info',NULL,'707-759-4230','https://scaliselawoffice.com','Company website','Phone verified on scaliselawoffice.com; no public email listed','Standard','New Lead'),
      ('BALF3-015','Office Team','Mark Scott Construction','Contractor','Contractor','Fairfield','Needs Contact Info',NULL,'(707) 864-8880',NULL,'Yelp business listing','Phone + address verified via Yelp, 2250 Boynton Ave, Fairfield, CA 94533; no public email found','Standard','New Lead'),
      ('BALF3-016','Dr. Warner','Mark J Warner, DDS','Dentist','Medical & Dental','Fairfield','info@dentistfairfieldca.com','info@dentistfairfieldca.com','707-422-7633','https://dentistfairfieldca.com','Company website (dentistfairfieldca.com/contact-us)','Email + phone + address verified on dentistfairfieldca.com, 1291 Oliver Rd, Fairfield, CA 94534','Standard','New Lead'),
      ('BALF3-017','Dr. Hicken','Scott C. Hicken, DDS','Dentist','Medical & Dental','Fairfield','hickendds@fairfieldcadentist.com','hickendds@fairfieldcadentist.com','(707) 429-1070','https://fairfieldcadentist.com','Company website (fairfieldcadentist.com/contact)','Email + phone + address verified on fairfieldcadentist.com, 1535 Webster St Ste B, Fairfield, CA 94533','Standard','New Lead'),
      ('BALF3-018','Malathy Subramanian','BBK Law','Attorney','Attorney','Walnut Creek','msubramanian@bbklaw.com','msubramanian@bbklaw.com','(925) 977-3300','https://bbklaw.com','Company website (bbklaw.com/locations/walnut-creek)','Email (Office Managing Partner) + phone verified on bbklaw.com, 1333 N. California Blvd Ste 220, Walnut Creek, CA 94596','Standard','New Lead'),
      ('BALF3-019','Ariel Brownell','The Law Offices of Ariel Brownell','Attorney','Attorney (Family Law)','Walnut Creek','Ariel@BrownellLegal.com','Ariel@BrownellLegal.com','925-255-0515','https://brownelllegal.com','Company website','Email + phone verified on brownelllegal.com','Standard','New Lead'),
      ('BALF3-020','Office Team','Lion Group Construction','Contractor','Contractor','Walnut Creek','liongroupconstruction@gmail.com','liongroupconstruction@gmail.com','1-925-235-1122','https://liongroupconstructionwc.com','Company website (liongroupconstructionwc.com)','Email + phone + address verified on liongroupconstructionwc.com, 291 Montecillo, Walnut Creek, CA 94595','Standard','New Lead'),
      ('BALF3-021','Office Team','LRL Builders','Contractor','Contractor','Walnut Creek','info@lrlbuilders.com','info@lrlbuilders.com','(925) 905-9995','https://lrlbuilders.com','Company website','Email + phone + address verified on lrlbuilders.com, 1661 Botelho Dr #293, Walnut Creek, CA 94596','Standard','New Lead'),
      ('BALF3-022','Office Team','Treat Boulevard Dentistry','Dentist','Medical & Dental','Walnut Creek','info@treatdentistry.com','info@treatdentistry.com','(925) 270-4147','https://treatdentistry.com','Company website (treatdentistry.com/contact)','Email + phone + address verified on treatdentistry.com, 1575 Treat Blvd Ste 115, Walnut Creek, CA 94598','Standard','New Lead'),
      ('BALF3-023','Rod Perry','Essential Construction Company','Contractor','Contractor','Concord','RodPerry@essentialconstruction.org','RodPerry@essentialconstruction.org','(925) 849-5787','https://essentialconstruction.org','Company website','Email + phone + address verified on essentialconstruction.org, 1317 La Vista Ave, Concord, CA 94521','Standard','New Lead'),
      ('BALF3-024','Office Team','Chestnut Square Dental','Dentist','Medical & Dental','Concord','contact@chestnutsquaredental.com','contact@chestnutsquaredental.com','(925) 685-8994','https://chestnutsquaredental.com','Company website','Email + phone + address verified on chestnutsquaredental.com, 3435 Chestnut Ave, Concord, CA 94519','Standard','New Lead'),
      ('BALF3-025','Lawrence Kolka','Edward Jones — Lawrence R Kolka','Financial Advisor','Financial Advisor','Walnut Creek','Needs Contact Info',NULL,'(925) 472-0322','https://edwardjones.com/us-en/financial-advisor/lawrence-kolka','Edward Jones official advisor directory','Phone + identity verified on edwardjones.com, 1801 N California Blvd Ste 107, Walnut Creek, CA 94596; no public email listed (Edward Jones routes contact through a form)','Standard','New Lead')
  ),
  prepared AS (
    SELECT
      i.*,
      CASE
        WHEN i.priority = 'Warm' THEN 80
        WHEN i.priority = 'Standard' THEN 65
        ELSE 45
      END AS lead_score_value,
      CASE
        WHEN i.industry ILIKE '%Real Estate%' THEN 'Mobile detailing for real estate professionals'
        WHEN i.industry ILIKE '%Insurance%' THEN 'Mobile detailing for insurance professionals'
        WHEN i.industry ILIKE '%Property%' THEN 'Mobile detailing for property management vehicles'
        WHEN i.industry ILIKE '%Contractor%' THEN 'Mobile detailing for contractor trucks and client-facing vehicles'
        WHEN i.industry ILIKE '%Dental%' OR i.industry ILIKE '%Medical%' THEN 'Mobile detailing for medical and dental professionals'
        WHEN i.industry ILIKE '%Attorney%' THEN 'Mobile detailing for local professional offices'
        WHEN i.industry ILIKE '%Financial%' THEN 'Mobile detailing for financial professionals'
        ELSE 'Mobile detailing for local Bay Area professionals'
      END AS service_needed_value,
      format('Mobile Detailing for %s — We Come to You', i.company) AS email_subject_value,
      format($email$Hi %s,

My name is Huey Roundtree with Great Freight Detailing. We provide mobile auto detailing throughout the Bay Area, including %s — we come to your location so a spotless, presentation-ready vehicle never costs you a trip anywhere.

For client-facing professionals, first impressions matter. I would love to offer a free demo detail on one vehicle so you can see the quality firsthand.

Do you have 10 minutes this week for a quick call?

Huey Roundtree
(323) 989-4510
huey.roundtree@gfldetail.com
https://gfldetail.com$email$,
        CASE
          WHEN i.contact_name = 'Office Team' THEN 'there'
          WHEN i.contact_name ILIKE 'Dr.%' THEN 'Dr.'
          ELSE split_part(i.contact_name, ' ', 1)
        END,
        i.city
      ) AS email_body_value,
      format($text$Hi %s, this is Huey with Great Freight Detailing — mobile auto detailing, we come to you. Wanted to offer %s a free demo detail on one vehicle. Worth a quick chat this week? (323) 989-4510$text$,
        CASE
          WHEN i.contact_name = 'Office Team' THEN 'there'
          WHEN i.contact_name ILIKE 'Dr.%' THEN 'Dr.'
          ELSE split_part(i.contact_name, ' ', 1)
        END,
        i.company
      ) AS text_template_value,
      format(
        'Role: %s
Industry: %s
Contact method from source: %s
Research source: %s
Verification note: %s
Imported from GFL_Local_Prospecting_Batch2_2026-07-13.xlsx.
Contacted: No
Auto-send: No
Next step: Huey reviews the staged outreach and sends manually through Zoho, text, call, or contact form.',
        i.role,
        i.industry,
        i.source_contact_method,
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
      email = COALESCE(l.email, p.email),
      source = CASE
        WHEN l.source IS NULL OR l.source = '' THEN 'Bay Area Lead Finder - Batch 2'
        WHEN l.source NOT ILIKE '%Bay Area Lead Finder - Batch 2%' THEN l.source || ' | Bay Area Lead Finder - Batch 2'
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
      outreach_status = COALESCE(l.outreach_status, CASE WHEN p.email IS NOT NULL THEN 'Ready to Send' ELSE 'Contact Form' END),
      zoho_email_sent = COALESCE(l.zoho_email_sent, false),
      email_subject = COALESCE(l.email_subject, p.email_subject_value),
      email_body = COALESCE(l.email_body, p.email_body_value),
      text_message_template = COALESCE(l.text_message_template, p.text_template_value),
      contact_method = COALESCE(l.contact_method, CASE WHEN p.email IS NOT NULL THEN 'Email' ELSE 'Phone / Contact Form' END),
      next_action = COALESCE(l.next_action, CASE WHEN p.email IS NOT NULL THEN 'Review personalized script and send manually in Zoho' ELSE 'Use contact form or call, then log outreach' END),
      service_needed = COALESCE(l.service_needed, p.service_needed_value),
      deposit_status = COALESCE(l.deposit_status, 'Not Requested'),
      appointment_status = COALESCE(l.appointment_status, 'Not Scheduled'),
      lead_score = COALESCE(l.lead_score, p.lead_score_value),
      notes = CASE
        WHEN COALESCE(l.notes, '') ILIKE '%Imported from GFL_Local_Prospecting_Batch2_2026-07-13.xlsx%' THEN l.notes
        ELSE trim(COALESCE(l.notes, '') || CASE WHEN COALESCE(l.notes, '') = '' THEN '' ELSE E'\n\n' END || p.notes_value)
      END,
      updated_at = now()
    FROM prepared p
    WHERE
      l.user_id IN (SELECT id FROM target_users)
      AND (
        (l.source_record_id IS NOT NULL AND l.source_record_id = p.lead_id)
        OR (
          p.email IS NOT NULL
          AND l.email IS NOT NULL
          AND lower(l.email) = lower(p.email)
        )
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
      p.email,
      'Bay Area Lead Finder - Batch 2',
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
      CASE WHEN p.email IS NOT NULL THEN 'Ready to Send' ELSE 'Contact Form' END,
      false,
      p.email_subject_value,
      p.email_body_value,
      p.text_template_value,
      CASE WHEN p.email IS NOT NULL THEN 'Email' ELSE 'Phone / Contact Form' END,
      CASE WHEN p.email IS NOT NULL THEN 'Review personalized script and send manually in Zoho' ELSE 'Use contact form or call, then log outreach' END,
      p.service_needed_value,
      'Not Requested',
      'Not Scheduled',
      p.lead_score_value,
      p.notes_value
    FROM prepared p
    CROSS JOIN target_users tu
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.leads l
      WHERE l.user_id = tu.id
        AND (
          (l.source_record_id IS NOT NULL AND l.source_record_id = p.lead_id)
          OR (
            p.email IS NOT NULL
            AND l.email IS NOT NULL
            AND lower(l.email) = lower(p.email)
          )
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
    (SELECT count(*) FROM prepared),
    (SELECT count(*) FROM inserted),
    (SELECT count(*) FROM updated)
  INTO v_candidate_count, v_inserted_count, v_updated_count;

  RAISE NOTICE 'GFL Local Prospecting Batch 2 import complete. Candidates: %, inserted: %, updated: %',
    v_candidate_count,
    v_inserted_count,
    v_updated_count;
END $$;

COMMIT;
