BEGIN;

-- Backup current CRM leads before the Concord import.
CREATE TABLE IF NOT EXISTS public.crm_backup_before_concord_20260711 AS
SELECT * FROM public.leads WITH NO DATA;

INSERT INTO public.crm_backup_before_concord_20260711
SELECT *
FROM public.leads
ON CONFLICT DO NOTHING;

WITH incoming (
  lead_id, industry, contact_name, business_name, email_or_contact_method, phone,
  website_source, address_service_area, priority, concord_status, verification_source,
  date_added, follow_up_date, email_subject
) AS (
  VALUES
  ('L-001','Realtor','Brian Reeg','CMG Home Loans','breeg@cmghomeloans.com','(925) 303-0915','https://www.cmghomeloans.com/branch/1338315/1200-Concord-Avenue-Suite-180-Concord-CA-94520','1200 Concord Ave, Suite 180, Concord, CA 94520','High','Ready to Send','Official website','2026-07-11'::date,'2026-07-14'::date,'Mobile detailing for CMG Home Loans'),
  ('L-002','Realtor','Glenn Allen','Compass','glenn.allen@compass.com','(925) 639-2969','https://www.compass.com/agents/locations/concord-ca/44337/','Concord service area','High','Ready to Send','Official Compass directory','2026-07-11'::date,'2026-07-14'::date,'Mobile detailing for Compass'),
  ('L-003','Realtor','Tim Allen Jr.','Compass','tim.allenjr@compass.com','(925) 979-5662','https://www.compass.com/agents/locations/concord-ca/44337/','Concord service area','High','Ready to Send','Official Compass directory','2026-07-11'::date,'2026-07-14'::date,'Mobile detailing for Compass'),
  ('L-004','Realtor','Ashley O''Malley','Compass / O''Malley Team','omalleyteam@compass.com','(925) 997-8526','https://www.compass.com/agents/locations/concord-ca/44337/','Concord service area','High','Ready to Send','Official Compass directory','2026-07-11'::date,'2026-07-14'::date,'Mobile detailing for Compass / O''Malley Team'),
  ('L-005','Realtor','Bob & Debbie Gibbs','Compass','gibbs@compass.com','(925) 984-3992','https://www.compass.com/agents/locations/clayton-valley-concord-ca/45447/','Clayton Valley / Concord','High','Ready to Send','Official Compass directory','2026-07-11'::date,'2026-07-14'::date,'Mobile detailing for Compass'),
  ('L-006','Realtor','Debbie Gibbs','Compass','debbie.gibbs@compass.com','(925) 389-6751','https://www.compass.com/agents/locations/clayton-valley-concord-ca/45447/','Clayton Valley / Concord','High','Ready to Send','Official Compass directory','2026-07-11'::date,'2026-07-14'::date,'Mobile detailing for Compass'),
  ('L-007','Realtor','Robert Moody','Compass','robert.moody@compass.com','(925) 216-6130','https://www.compass.com/agents/robert-moody/','Concord / East Bay','High','Ready to Send','Official agent page','2026-07-11'::date,'2026-07-14'::date,'Mobile detailing for Compass'),
  ('L-008','Realtor','Shelly Gwynn','Compass','shelly.gwynn@compass.com','(925) 207-3069','https://www.compass.com/agents/shelly-gwynn/','Concord / Contra Costa','High','Ready to Send','Official agent page','2026-07-11'::date,'2026-07-14'::date,'Mobile detailing for Compass'),
  ('L-009','Realtor','Dean Okamura','Compass','dean.okamura@compass.com','(925) 708-3133','https://www.compass.com/agents/dean-okamura/','Concord / East Bay','High','Ready to Send','Official agent page','2026-07-11'::date,'2026-07-14'::date,'Mobile detailing for Compass'),
  ('L-010','Realtor','Lilli Rath','Compass','lilli.rath@compass.com','(925) 286-4118','https://www.compass.com/agents/lilli-rath/','Concord / Clayton','High','Ready to Send','Official agent page','2026-07-11'::date,'2026-07-14'::date,'Mobile detailing for Compass'),
  ('L-011','Realtor','Miguel G. del Barco','Compass','miguel.delbarco@compass.com','(925) 478-9545','https://www.compass.com/agents/miguel-barco/','Concord / East Bay','High','Ready to Send','Official agent page','2026-07-11'::date,'2026-07-14'::date,'Mobile detailing for Compass'),
  ('L-012','Realtor','Karen Hultman','Compass','karen.hultman@compass.com','(925) 324-2652','https://www.compass.com/agents/karen-hultman/','Concord / East Bay','High','Ready to Send','Official agent page','2026-07-11'::date,'2026-07-14'::date,'Mobile detailing for Compass'),
  ('L-013','Realtor','Alison Holmgren','Compass','alison.holmgren@compass.com','(925) 997-1976','https://www.compass.com/agents/alison-holmgren/','Concord / East Bay','High','Ready to Send','Official agent page','2026-07-11'::date,'2026-07-14'::date,'Mobile detailing for Compass'),
  ('L-014','Financial Advisor','Gary Cruff','Ameriprise Financial','Gary.M.Cruff@ampf.com','(415) 599-1968','https://www.ameripriseadvisors.com/gary.m.cruff/contact/','1320 Willow Pass Rd, 6th Floor, Concord, CA 94520','High','Ready to Send','Official advisor page','2026-07-11'::date,'2026-07-14'::date,'Convenient mobile detailing for Ameriprise Financial'),
  ('L-015','Real Estate Brokerage','Office Team','CENTURY 21 Epic','info@c21epic.com','(925) 849-8100','https://www.century21.com/office/detail/ca/concord/offices/century-21-epic/oid-P00400000FicORb4o3GF6pxV7yEF3vnsWxFaEwpf','1000 Burnett Ave, Concord, CA 94520','High','Ready to Send','Official brokerage page','2026-07-11'::date,'2026-07-14'::date,'Mobile detailing for CENTURY 21 Epic'),
  ('L-016','Insurance','Grant Emerson Weber','TruSummit Insurance Solutions','Support@TruSummitIns.com','(925) 452-6969','https://www.trusummitins.com/insurance-agent-concord-ca/','51 John Glenn Dr, Concord, CA 94520','High','Ready to Send','Official agency website','2026-07-11'::date,'2026-07-14'::date,'Local mobile detailing for TruSummit Insurance Solutions'),
  ('L-017','Insurance','Courtney Khashabi','State Farm','Use official Email Agent button','(925) 356-7900','https://www.statefarm.com/agent/us/ca/concord/courtney-khashabi-rgcrw6bc6ak','901 Sunvalley Blvd, Suite 230, Concord, CA 94520','Medium','Contact Form','Official State Farm page','2026-07-11'::date,'2026-07-14'::date,'Local mobile detailing for State Farm'),
  ('L-018','Insurance','Hamid Ray Asemi','State Farm','Use official Email Agent button','(925) 726-0154','https://www.statefarm.com/agent/us/ca/concord/hamid-asemi-2f6m61ys000','3600 Clayton Rd, Suite A, Concord, CA 94521','Medium','Contact Form','Official State Farm page','2026-07-11'::date,'2026-07-14'::date,'Local mobile detailing for State Farm'),
  ('L-019','Insurance','Kwon Lee','State Farm','Use official Email Agent button','(925) 827-3500','https://www.statefarm.com/agent/us/ca/concord/kwon-lee-41km51ys000','1251 Monument Blvd, Suite 200, Concord, CA 94520','Medium','Contact Form','Official State Farm page','2026-07-11'::date,'2026-07-14'::date,'Local mobile detailing for State Farm'),
  ('L-020','Insurance','Elena Sadur','State Farm','Use official Email Agent button','(925) 689-9980','https://www.statefarm.com/agent/us/ca/concord/elena-sadur-qyqwn3bs000','5167 Clayton Rd, Suite A1, Concord, CA 94521','Medium','Contact Form','Official State Farm page','2026-07-11'::date,'2026-07-14'::date,'Local mobile detailing for State Farm')
),
prepared AS (
  SELECT
    i.*,
    CASE WHEN i.email_or_contact_method ILIKE '%@%' THEN i.email_or_contact_method ELSE NULL END AS email,
    CASE WHEN i.email_or_contact_method ILIKE '%@%' THEN NULL ELSE i.email_or_contact_method END AS contact_method_value,
    split_part(replace(i.contact_name, '&', ' '), ' ', 1) AS first_name,
    CASE
      WHEN i.industry IN ('Realtor', 'Real Estate Brokerage') THEN
        format('Hi %s,

My name is Huey Roundtree, owner of Great Freight Detailing. I’m reaching out because real estate professionals spend a lot of time meeting clients, showing properties, and representing their brand on the road.

We provide professional mobile detailing at the office or home, helping busy agents keep their vehicles clean and client-ready without losing time during the workday.

I’d appreciate the opportunity to earn your business and become a dependable detailing resource for you and your team. Services start at $100, and we serve Concord and the surrounding East Bay.

Website: https://gfldetail.com
Booking: https://bay-area-102518.square.site

Best regards,
Huey Roundtree
Owner | Great Freight Detailing
huey.roundtree@gfldetail.com', split_part(replace(i.contact_name, '&', ' '), ' ', 1))
      WHEN i.industry = 'Financial Advisor' THEN
        format('Hi %s,

My name is Huey Roundtree, owner of Great Freight Detailing. I’m introducing our mobile detailing service to local Concord professionals who regularly meet clients and represent their business in the community.

We come directly to your office or home, making it easy to keep your vehicle clean and professional without interrupting your schedule.

I’d value the opportunity to earn your business and become a trusted detailing resource for you or your team. Services start at $100.

Website: https://gfldetail.com
Booking: https://bay-area-102518.square.site

Best regards,
Huey Roundtree
Owner | Great Freight Detailing
huey.roundtree@gfldetail.com', split_part(replace(i.contact_name, '&', ' '), ' ', 1))
      ELSE
        format('Hi %s,

My name is Huey Roundtree, owner of Great Freight Detailing. I’m reaching out to connect with local Concord business professionals.

We provide mobile detailing at the office or home, helping insurance professionals keep their vehicles clean and client-ready without taking time away from serving customers.

I’d appreciate the opportunity to earn your business or support your team whenever a vehicle needs professional detailing. Services start at $100.

Website: https://gfldetail.com
Booking: https://bay-area-102518.square.site

Best regards,
Huey Roundtree
Owner | Great Freight Detailing
huey.roundtree@gfldetail.com', split_part(replace(i.contact_name, '&', ' '), ' ', 1))
    END AS email_body_value,
    format('Hi %s, this is Huey with Great Freight Detailing. I sent over a quick introduction about our mobile detailing service for Concord professionals. We come directly to your office or home, and services start at $100. You can learn more at https://gfldetail.com. Thank you.', split_part(replace(i.contact_name, '&', ' '), ' ', 1)) AS text_template
  FROM incoming i
),
matched AS (
  UPDATE public.leads l
  SET
    crm_id = COALESCE(l.crm_id, 'CONCORD-' || p.lead_id),
    industry = COALESCE(l.industry, p.industry),
    city = COALESCE(l.city, 'Concord'),
    name = COALESCE(NULLIF(l.name, ''), p.contact_name),
    business = COALESCE(l.business, p.business_name),
    email = COALESCE(l.email, p.email),
    phone = COALESCE(l.phone, p.phone),
    source = CASE
      WHEN l.source IS NULL OR l.source = '' THEN 'Concord Professional Outreach'
      WHEN l.source NOT ILIKE '%Concord Professional Outreach%' THEN l.source || ' | Concord Professional Outreach'
      ELSE l.source
    END,
    source_record_id = COALESCE(l.source_record_id, p.lead_id),
    source_url = COALESCE(l.source_url, p.website_source),
    address_service_area = COALESCE(l.address_service_area, p.address_service_area),
    priority = COALESCE(l.priority, p.priority),
    verification_source = COALESCE(l.verification_source, p.verification_source),
    date_added = COALESCE(l.date_added, p.date_added),
    lead_type = 'Detailing',
    business_unit_id = COALESCE(l.business_unit_id, '11111111-1111-4111-8111-111111111111'),
    estimated_value = COALESCE(l.estimated_value, 100),
    status = CASE WHEN l.status IS NULL THEN 'New Lead'::public.lead_status ELSE l.status END,
    outreach_status = CASE
      WHEN COALESCE(l.source, '') ILIKE '%Concord Professional Outreach%' THEN l.outreach_status
      ELSE p.concord_status
    END,
    email_subject = COALESCE(l.email_subject, p.email_subject),
    email_body = COALESCE(l.email_body, p.email_body_value),
    text_message_template = COALESCE(l.text_message_template, p.text_template),
    contact_method = COALESCE(l.contact_method, p.contact_method_value),
    next_action = COALESCE(l.next_action, 'Send personalized introduction'),
    next_follow_up_at = COALESCE(l.next_follow_up_at, p.follow_up_date::timestamptz),
    notes = COALESCE(l.notes, ''),
    updated_at = now()
  FROM prepared p
  WHERE
    (
      p.email IS NOT NULL AND l.email IS NOT NULL AND lower(l.email) = lower(p.email)
    )
    OR (
      regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g') <> ''
      AND regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g') = regexp_replace(COALESCE(p.phone, ''), '\D', '', 'g')
    )
    OR (
      lower(COALESCE(l.business, '')) = lower(p.business_name)
      AND lower(COALESCE(l.name, '')) = lower(p.contact_name)
    )
  RETURNING l.user_id, p.lead_id
)
INSERT INTO public.leads (
  user_id, crm_id, name, business, email, phone, source, source_record_id, source_url,
  industry, city, address_service_area, priority, verification_source, date_added,
  lead_type, business_unit_id, estimated_value, status, outreach_status, email_subject,
  email_body, text_message_template, contact_method, next_action, next_follow_up_at,
  service_needed, deposit_status, appointment_status, lead_score, notes
)
SELECT
  pr.id,
  'CONCORD-' || p.lead_id,
  p.contact_name,
  p.business_name,
  p.email,
  p.phone,
  'Concord Professional Outreach',
  p.lead_id,
  p.website_source,
  p.industry,
  'Concord',
  p.address_service_area,
  p.priority,
  p.verification_source,
  p.date_added,
  'Detailing',
  '11111111-1111-4111-8111-111111111111',
  100,
  'New Lead',
  p.concord_status,
  p.email_subject,
  p.email_body_value,
  p.text_template,
  p.contact_method_value,
  'Send personalized introduction',
  p.follow_up_date::timestamptz,
  'Mobile detailing for Concord professionals',
  'Not Requested',
  'Not Scheduled',
  CASE WHEN p.priority = 'High' THEN 85 ELSE 65 END,
  'Imported from GFL_Concord_Prospect_Pipeline.xlsx'
FROM public.profiles pr
CROSS JOIN prepared p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.leads l
  WHERE l.user_id = pr.id
    AND (
      (p.email IS NOT NULL AND l.email IS NOT NULL AND lower(l.email) = lower(p.email))
      OR (
        regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g') <> ''
        AND regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g') = regexp_replace(COALESCE(p.phone, ''), '\D', '', 'g')
      )
      OR (
        lower(COALESCE(l.business, '')) = lower(p.business_name)
        AND lower(COALESCE(l.name, '')) = lower(p.contact_name)
      )
    )
);

COMMIT;
