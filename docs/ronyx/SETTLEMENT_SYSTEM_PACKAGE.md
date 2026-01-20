# Ronyx Settlement System – Technical Package Index

Single source of truth is the implemented schema, APIs, and UI pages. This index
links to the canonical artifacts so we avoid duplicated content.

## Schema (Canonical)
- `app/db/migrations/046_driver_pay_rates.sql`
- `app/db/migrations/047_driver_settlements.sql`
- `app/db/migrations/048_settlement_disputes.sql`

## API (Canonical)
- `app/api/ronyx/drivers/[driver_id]/process-ticket/route.ts`
- `app/api/settlement/dispute/route.ts`
- `app/api/driver-event/route.ts`
- `app/api/dashboard-snapshot/route.ts`

## UI (Canonical)
- `app/ronyx/driver-app/page.tsx` (Driver settlement view)
- `app/ronyx/drivers/page.tsx` (Office settlement controls)

## Ops Scripts
- `docs/ronyx/SETTLEMENT_MIGRATION_SCRIPT.sh`
- `docs/ronyx/SETTLEMENT_MIGRATION_SCRIPT_POSTGRES.sh`

## Templates & Flow
- `docs/ronyx/SETTLEMENT_PREVIEW_TEMPLATE.html`
- `docs/ronyx/SETTLEMENT_LOCK_FLOW.md`

## Rollout Plan
- `docs/ronyx/IMPLEMENTATION_CHECKLIST.md`
