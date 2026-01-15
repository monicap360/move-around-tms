# Aggregate Reconciliation Workflow

## Why This Is Specialized (Not Generic TMS)
- Native scale ticket fields (gross/tare/net, moisture, scale type/source)
- Lab-quality integration (fines, gradation, contamination, strength)
- Delivery proofing (geofence match, GPS, signature/photo capture)
- Industry tolerances (moisture, scale, quality, delivery window)
- Exception routing by operations (warehouse, procurement, accounting)

## Data Sources
- Scale House Tickets → `aggregate_tickets`
- Lab Test Results → `aggregate_lab_results`
- Delivery Proofs → `aggregate_delivery_proofs`
- Customer Invoices → `invoices` (linked by `invoice_number`)

## Matching Logic
1. **Quantity match** (net weight vs ticket quantity)
2. **Quality match** (moisture and fines vs tolerances)
3. **Delivery match** (geofence + delivery time window)
4. **Price match** (invoice total vs ticket total)

## Outputs
- `aggregate_reconciliation_results`
- `aggregate_reconciliation_exceptions`
- `workflow_tickets` for department routing

## Exception Routing
- Quantity/scale mismatch → Warehouse
- Quality issues → Procurement
- Delivery issues → Warehouse
- Price variance → Accounting

## Tolerance Settings
Stored in `aggregate_tolerance_settings` and passed into the reconciliation run.

## Run API
`POST /api/aggregates/reconciliation/run`
```json
{
  "scaleTolerancePct": 2,
  "moistureTolerancePct": 1,
  "finesTolerancePct": 1,
  "priceVariancePct": 5,
  "deliveryWindowHours": 12
}
```

## Results API
`GET /api/aggregates/reconciliation/results`

## Deployment
Run the migration when the Postgres connection is available:

```bash
psql "<DATABASE_URL>" -f db/migrations/068_aggregate_reconciliation.sql
```

If using the Supabase SQL editor, paste the contents of
`db/migrations/068_aggregate_reconciliation.sql` and run it as a single script.

## Post-Deploy Verification
Use these checks to confirm the schema and workflow are ready:

```sql
-- Core tables
select to_regclass('public.aggregate_tickets') as aggregate_tickets;
select to_regclass('public.aggregate_lab_results') as aggregate_lab_results;
select to_regclass('public.aggregate_delivery_proofs') as aggregate_delivery_proofs;
select to_regclass('public.aggregate_reconciliation_runs') as aggregate_reconciliation_runs;
select to_regclass('public.aggregate_reconciliation_results') as aggregate_reconciliation_results;
select to_regclass('public.aggregate_reconciliation_exceptions') as aggregate_reconciliation_exceptions;

-- Optional: tolerance settings
select to_regclass('public.aggregate_tolerance_settings') as aggregate_tolerance_settings;
```

## UI Entry Points
- Reconciliation UI: `/aggregates/reconciliation`
- Import templates:
  - `public/templates/lab-results-import-template.csv`
  - `public/templates/delivery-proofs-import-template.csv`
