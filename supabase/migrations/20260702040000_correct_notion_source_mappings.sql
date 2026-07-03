-- Correct the two production Notion destinations identified by the
-- Knowledge Consolidation handoff. Reset verification evidence because a
-- destination change must be verified by a fresh Notion API response.

UPDATE public.sync_mappings
SET
  target_ref = '37f0c11a-8316-810c-bc3d-c6b7679c1244',
  status = 'Not Connected',
  verified_at = NULL,
  last_sync_at = NULL,
  last_error = NULL
WHERE provider = 'Notion'
  AND entity = 'daily_checkins'
  AND target_ref = '3720c11a-8316-8180-bcef-e923c077928b';

UPDATE public.sync_mappings
SET
  target_ref = '3720c11a-8316-81dd-bb3a-e3928f1880a1',
  status = 'Not Connected',
  verified_at = NULL,
  last_sync_at = NULL,
  last_error = NULL
WHERE provider = 'Notion'
  AND entity = 'leads'
  AND target_ref IS DISTINCT FROM '3720c11a-8316-81dd-bb3a-e3928f1880a1';
