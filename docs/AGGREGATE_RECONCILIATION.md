# Aggregate Reconciliation Workflow

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
