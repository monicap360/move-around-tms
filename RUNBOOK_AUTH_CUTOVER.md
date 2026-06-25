# Runbook — Multi-Tenant Auth Cutover (`RONYX_AUTH_REQUIRED`)

**This is the single highest-outage-risk action in the system.** Flipping the flag
with inconsistent data breaks **every** tenant at once — including Ronyx. Treat it
like a production database migration: pre-flight, low-traffic window, canary, and a
rehearsed rollback.

## What the flag does
- `RONYX_AUTH_REQUIRED=false` (today): `resolveOrgId()` returns the env `RONYX_ORG_ID`
  for everyone → single-tenant Ronyx. Safe, current behavior.
- `RONYX_AUTH_REQUIRED=true` (cutover): `resolveOrgId()` returns the **logged-in
  user's** `profiles.organization_id`. Every route/webhook/storage path becomes
  tenant-scoped. If a tenant's data or user profiles are mis-stamped, that tenant
  sees nothing (or errors).

## Pre-flight checklist — ALL must pass before flipping
Run in the Supabase SQL editor.

- [ ] **Every user maps to an org.** No authenticated user should resolve to null.
  ```sql
  select count(*) as users_without_org
  from public.profiles where organization_id is null;   -- expect 0 (for active users)
  ```
- [ ] **Owner-operator rows are org-stamped** (else the OO list filter hides them):
  ```sql
  select count(*) as oos_without_org
  from public.ronyx_owner_operators where organization_id is null;   -- expect 0
  ```
- [ ] **The second tenant exists** with its own org row + at least one user whose
  `profiles.organization_id` points to it.
  ```sql
  select id, name, organization_slug, organization_code, status
  from public.organizations order by created_at desc;
  ```
- [ ] **A/B isolation test (manual):** log in as a Tenant-A user → confirm dashboard,
  owner-operators, tickets, payroll show ONLY Tenant-A data. Repeat as Tenant-B.
  Neither tenant may see the other's rows.
- [ ] **Storage isolation:** an upload as Tenant-A lands under `"{A_org_id}/..."`; a
  signed URL issued to A cannot read B's objects.
- [ ] **Webhook tenant resolution:** a test RMIS/SaferWatch payload with a known
  carrier `mc_number`/`dot_number` resolves to the correct org (carrier → OO → org);
  an unknown carrier returns 422 (no default org).
- [ ] **CI guard is green** and (ideally) flipped to fail-fast (`REPORT_ONLY=false`
  in `scripts/ci-multitenant-guard.sh`).

## Flip (low-traffic window)
Dump-truck dispatch peaks early morning — pick **late evening**, not 5–7am.

1. Render → service → **Environment** → set `RONYX_ORG_ID` to remain as a fallback is
   NOT needed; set **`RONYX_AUTH_REQUIRED=true`** → Save (triggers redeploy).
2. Watch the deploy go green; `/api/health` must return 200.
3. **Canary:** immediately log in as one user per tenant and spot-check the A/B
   isolation items above. Keep this runbook open.

## ROLLBACK (one action — rehearse it first)
If any tenant sees wrong/empty data or errors spike:

> **Render → Environment → set `RONYX_AUTH_REQUIRED=false` → Save.**

This instantly restores single-tenant Ronyx behavior (the flag is read per request;
no code change, no migration to undo). Equivalent alternative: Render → Deploys →
**Rollback** to the pre-flip deploy. Either path returns to a known-good state in one
step. Confirm `/api/health` 200 + Ronyx dashboard renders, then debug the data offline.

## After a successful cutover
- Keep `RONYX_ORG_ID` set (harmless; only used when the flag is off).
- Promote the multi-tenant guard and (once burned down) `tsc --noEmit` to blocking.
- Then — and only then — generic carrier routing delivers value (see the routing
  decision: shared `/ronyx/*` shell vs. full `/[org]` refactor).
