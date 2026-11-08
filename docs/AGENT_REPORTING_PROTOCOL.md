# Huey HQ — Specialist → Malcolm reporting contract (draft, 2026-11-08)

**Scope:** This is the shared reporting footer for ChatGPT and Claude specialists. This file alone does not connect a scheduled task, grant access, run a worker, or write to Supabase.

## Footer to append to each specialist run

After completing assigned **read/research/draft** work, write exactly one report. Never claim an action was executed without a verified tool result.

- **date_pacific**: YYYY-MM-DD (America/Los_Angeles)
- **report_run_id**: stable unique identifier per scheduled execution, for idempotency
- **source**: chatgpt-scheduled-task, claude-scheduled-task, or manually verified source
- **agent_id**: stable agent identifier
- **department**: one of executive/revenue/marketing/finance/operations/technology/administration
- **task**: concise, specific assignment
- **status**: inbox (recorded, not attempted), assigned (pending), working (attempted; outcome not verified), blocked, awaiting_approval, verified_complete (ONLY with evidence independently checked)
- **action**: research, draft, organize, internal_update only unless explicitly authorized in a separate signed-in owner workflow
- **evidence_url**: stable, accessible report or source URI; empty if none exists
- **verified_at** / **verifier**: omit until evidence has been independently checked
- **owner_approval_required**: true/false; never interpret a queued task as approval
- **blocker**: failure reason with tool or connector name if applicable
- **next_action**: single concrete next step

## Database filing rules

1. Use the authenticated, explicitly authorized Supabase connector for project `mqmskpdduwbiypepzkvc`. Do not embed project secrets, credentials, or a service-role key in prompts, Notion, or the frontend.
2. Check `public.agent_tasks` by owner, source, and run identifier **before** inserting. The current schema has no dedicated run ID/unique constraint, so best-effort duplicate checking is not concurrency-safe. Production idempotency requires a schema change.
3. Insert one report **only for verified work** under the authenticated owner's account. Do not invent an owner UUID from a chat message; obtain it from the signed-in connection.
4. Write `action='research'`, `approved_by_owner=false`, and `status='inbox'` or `'blocked'` for unverified scheduled summaries. A database insert is proof of filing, not proof of research quality or agent execution.
5. Read the inserted row back and verify its ID. Record failure as NOT FILED, with the exact connector error. Never silently mark the job successful.
6. Do not write other owners' records, alter leads or finances, send messages, place trades, make purchases, publish, delete, or deploy.
7. Malcolm consumes **non-test** reports (`source != 'claude-test'` and titles not beginning `TEST ONLY:`); highlights dated evidence, blocked assignments, and approvals; and distinguishes queued reports from independently verified outcomes.
8. Notion sync is a separate stage, not established by the Supabase row. Update the **existing** Notion Command Center, never create duplicate dashboards, and report any sync failure.

## Release checks before owner approval

- CI tests and build green on the PR head; migration history inspected.
- RLS, privileges, and auth isolation tested from **two separate signed-in test users**, not merely an admin SQL query.
- A generated report flows to Supabase, then is retrieved by the signed-in app, and appears in Malcolm's existing Executive page without counting a TEST ONLY row.
- Verify refresh, duplicate handling, missing evidence display, and blocked status.
- Verify restricted actions **cannot** execute on approval; an actual worker, audit log, and connector-specific permissions remain out of scope until tested.
- Preserve the original design and production data. Do not merge or deploy without Huey's final sign-off.

## Current verified state (2026-11-08)

- Claude test row and real daily blocked report exist in `public.agent_tasks`.
- PR #22 is a draft; the new Agent Control Center is not confirmed deployed.
- The existing `agent_tasks` RLS owner policy is enabled. The old Concord CRM backup table still has RLS disabled.
- Claude and ChatGPT scheduled tasks do not thereby become a functioning shared agent runtime.
