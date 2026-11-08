# Huey HQ — CEO reporting and WhatsApp delivery contract

Status: DEVELOPMENT SPEC ONLY. No WhatsApp account, sender, webhook, or production integration is connected by this file. No outbound messages authorized.

## Canonical reporting data
- Supabase agent_tasks is the proposed task store after its migration is applied.
- Add append-only agent_activity records (actor, task_id, event_type, status, source_uri, occurred_at, verified_at, verifier, owner_id, correlation_id). All records must enforce owner RLS and idempotency.
- Every completed-work claim must have evidence/source URI and a verification state. Distinguish queued, running, blocked, awaiting approval, completed-unverified, verified-complete.
- CEO aggregates evidence, blockers, approvals, and next actions from real persisted records, never role definitions or guessed automation activity.

## Two read surfaces
- Existing Huey HQ app: agent roster, task status, activity timeline, owner approval queue, and report history; preserve original UI and routes.
- Original Notion Command Center and CEO Command Center: update existing reporting board in place; store latest verified snapshot timestamp, deep links, and sync error state. Do not create duplicate dashboards or replace unrelated content.
- A backend sync job should upsert one dated CEO report using stable external IDs, with retries and audit trail. Failed sync must be visible, not reported as success.

## WhatsApp delivery (not enabled)
- Use official WhatsApp Business Platform Cloud API or a vetted business solution provider; verify eligibility, sender phone number, account, opt-in and template approval where required.
- Store access tokens in server-side secrets only, never Vite/browser variables, GitHub, or Notion.
- Owner must explicitly confirm destination phone number, message cadence, consent, and approve the first outbound test.
- Backend delivery worker reads only a verified CEO report snapshot. Send short summary: Top 3; verified agent results; blockers; approval count; next action; link to HQ dashboard.
- Keep client outreach, trading, spending, transfers, publishing, deletion and external commitments out of automatic execution. WhatsApp reply alone must not authorize sensitive actions without authenticated confirmation.
- Record delivery status, message ID, retries and failure reasons; never imply a message was delivered until confirmed.

## Verification and release gates
1. Apply/test SQL migration and owner RLS in the intended Supabase project.
2. Implement actual agent worker execution and append-only event logging, with permission-scoped capabilities.
3. Verify task create/approve/evidence, report compilation, and Notion upsert using a test account.
4. Configure WhatsApp business sender and approved template/opt-in; dry-run without sending.
5. Ask owner before first outbound WhatsApp message and before production deployment.
6. Verify end-to-end delivery, Notion freshness, app freshness and failure handling after authorized release.
