# Matching & Reconciliation Logic

## Purpose
Match PIT data, material receipts, supplier invoices, and PO data to produce:
- `matched_records` for clean reconciliations
- `matching_exceptions` + `exception_queue` entries when mismatches occur

## Inputs
- `pit_data`
- `material_receipts`
- `supplier_invoices`
- `po_data`

## Outputs
- `matched_records`
- `matching_exceptions`
- `exception_queue` (entity_type = `matching`)

## Matching Criteria
1. **Material + Batch/Lot** (primary key)
2. **Quantity variance** (default threshold 2%)
3. **UOM normalization** (ton/lb/kg supported)
4. **Price variance** (PO vs invoice, default threshold 5%)
5. **Delivery date window** (default 7 days)

## Exception Types
- `missing_receipt`
- `missing_po`
- `uom_mismatch`
- `quantity_variance`
- `price_variance`
- `date_window`

## Run API
`POST /api/matching/run`
```json
{
  "quantityVariancePct": 2,
  "priceVariancePct": 5,
  "deliveryWindowDays": 7
}
```

## Results API
`GET /api/matching/results`

## Notes
- Non‑convertible UOM values trigger `uom_mismatch`.
- Variance thresholds are configurable at run time.
