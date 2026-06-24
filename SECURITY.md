# Security — Row-Level Security (RLS) posture

This document records **intentional** RLS decisions so that Supabase security-advisor
alerts (`rls_enabled_no_policy`, `rls_disabled_in_public`) are not "fixed" by mistake.

Last reviewed: 2026-06-24.

## Access model (important context)

Most data access in this app happens **server-side via the Supabase service role**
(`supabaseAdmin`), which **bypasses RLS**. Client (browser) reads use the anon/authenticated
key and **are** subject to RLS. Therefore:

- A table that is only touched by server routes does **not** need a client policy.
- `rls_enabled_no_policy` is the **correct, secure** state for service-role-only tables
  (it denies all anon/authenticated access while server routes keep working).
- The real danger is `rls_disabled_in_public` (a public table with **no** RLS is exposed
  to anyone with the anon key).

## Intentionally service-role-only (RLS ENABLED, NO POLICY — do NOT add client policies)

These tables are deliberately locked. Each was verified to have **no client-side
`.from()` usage**; they are written/read only by server routes (service role), or are
system/audit/archive tables that clients must never touch.

| Table | Why locked |
|---|---|
| `schema_migrations` | Migration ledger — system only. Never client-accessed. |
| `document_access_log` | Audit log — clients must not read/tamper. |
| `document_provenance` | Audit/provenance — server-written only. |
| `deleted_drivers_archive` | Soft-delete archive — admin/server only. |
| `compliance_overrides` | Server-managed compliance state. |
| `customer_dispatch_requirements` | Server/admin-managed config. |
| `customer_requirement_checks` | Server-computed checks. |
| `dispatch_import_rows` | Raw import staging — server only. |
| `dispatch_rmis_note_rules` | Dispatch Guard™ rule config — server only. |
| `module_registry` | Module catalog — server only. |
| `ronyx_ticket_ocr_extractions` | OCR pipeline output — server only. |
| `referrals` | Partner referral records — not read client-side. |

**Guardrail:** Do not add `authenticated`/`anon` policies to the tables above to silence
the advisor. If a future feature needs client access to one of them, add a **scoped**
policy (org- or owner-scoped), never a blanket `using (true)` / `auth.role()='authenticated'`,
and move it out of this list with a note.

## Deliberate exceptions (client-read → policy required)

| Table | Decision | Migration |
|---|---|---|
| `partners` | Read client-side in 12 files (role-auth, marketplace, owner dashboard). Permissive authenticated policy. Tighten to owner/admin-scoped later. | `221_fix_partners_referrals_rls.sql` |

## Fixed exposures (RLS was DISABLED on public tables)

| Table | Decision | Migration |
|---|---|---|
| `yards` | RLS enabled + service-role policy (no client access). | `222_enable_rls_yards_payroll_weeks.sql` |
| `payroll_weeks` | RLS enabled + service-role policy (no client access). | `222_enable_rls_yards_payroll_weeks.sql` |

## Reviewer checklist for new advisor alerts

1. **`rls_disabled_in_public`** → always fix. Enable RLS. If no client reads the table,
   a service-role policy (or no policy) is enough; if clients read it, add a **scoped** policy.
2. **`rls_enabled_no_policy`** → not automatically a bug.
   - Check client usage: `grep -rIl ".from('<table>')" app lib | xargs grep -l "use client"`.
   - **0 client files** → leave locked; add the table to the list above with a one-line reason.
   - **>0 client files** → add the **minimum** policy needed (prefer scoped over permissive).
3. Never add a blanket policy purely to clear an advisor warning.
4. The canonical admin predicate for scoped policies (live `profiles` shape is `user_id`-keyed):
   ```sql
   exists (select 1 from public.profiles p
           where p.user_id = auth.uid()
             and (lower(coalesce(p.role,'')) in ('super_admin','super admin')
                  or p.is_platform_admin = true))
   ```
