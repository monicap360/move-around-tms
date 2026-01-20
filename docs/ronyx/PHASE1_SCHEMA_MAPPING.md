# Phase 1 Schema Mapping & Migration Plan

This maps your Phase 1 schema to the current Supabase/Postgres structure and
defines the migration steps we implemented.

## 1) Table Mapping

### Tickets
- **Phase 1:** `tickets`
- **Existing:** `aggregate_tickets`
- **Action:** Extend `aggregate_tickets` with Phase 1 fields.
- **Key mapping:**
  - `ticket_id` → `aggregate_tickets.ticket_id` (new)
  - `material_type` → `aggregate_tickets.material_type` (new)
  - `load_weight` → `aggregate_tickets.load_weight` (new)
  - `cubic_yards` → `aggregate_tickets.cubic_yards` (new)
  - `pickup_gps_lat/lon`, `dump_gps_lat/lon` → new columns
  - `calculated_distance`, `waiting_minutes` → new columns
  - `status` → existing `aggregate_tickets.status`
  - `has_photo`, `has_signature`, `weight_ticket_verified` → new columns

### Customers
- **Phase 1:** `customers`
- **Existing:** none
- **Action:** Create `ronyx_customers`.

### Projects
- **Phase 1:** `projects`
- **Existing:** none
- **Action:** Create `ronyx_projects` with rate structure.

### Trucks
- **Phase 1:** `trucks`
- **Existing:** `trucks` (minimal fields)
- **Action:** Extend `trucks` with capacity, fuel, and maintenance fields.

### Drivers
- **Phase 1:** `drivers`
- **Existing:** `drivers` (minimal fields)
- **Action:** Extend `drivers` with CDL, employee, and pay fields.

### Invoices
- **Phase 1:** invoice engine
- **Existing:** `ronyx_invoices` (used by UI, missing in migrations)
- **Action:** Create `ronyx_invoices` with Phase 1 totals.

## 2) Migration Plan (Implemented)

1. **Create core entities**
   - `ronyx_customers`
   - `ronyx_projects`
   - `ronyx_invoices`

2. **Extend existing tables**
   - `aggregate_tickets` (Phase 1 ticket fields)
   - `trucks` (capacity, fuel, maintenance)
   - `drivers` (employment & CDL fields)

3. **Add indexes**
   - `aggregate_tickets.ticket_id` unique index

## 3) Service Layer (Implemented)

- Ticket ID generation, distance, and waiting time:
  `app/lib/ronyx/phase1/ticketGenerator.ts`
- Invoice generation from Phase 1 ticket rules:
  `app/lib/ronyx/phase1/invoiceEngine.ts`

## 4) API Wiring (Implemented)

- Ticket creation now uses the generator and Phase 1 fields:
  `POST /api/ronyx/tickets`
- Phase 1 invoice generation:
  `POST /api/ronyx/invoices` with `{ action: "generate_phase1_invoice", ticket_ids: [...] }`

## 5) Next Recommended Step

- Add UI management for `ronyx_customers` and `ronyx_projects`.
- Add GPS distance capture on driver app for full distance validation.
