# Settlement Test Plan (Next.js)

This mirrors the PHP test intentions using our current Next.js API endpoints.

## 1) Process Ticket Creates Settlement Item
- Endpoint: `POST /api/ronyx/drivers/{driver_id}/process-ticket`
- Setup:
  - Create a driver
  - Add two rates (default + material-specific)
- Expected:
  - `201` with `rate_value` from the most specific rate
  - `driver_settlement_items` row created
  - Duplicate ticket blocked on re‑submit

## 2) Prevent Duplicate Ticket Processing
- Endpoint: `POST /api/ronyx/drivers/{driver_id}/process-ticket`
- Expected:
  - Second call returns `409` with "Ticket already processed"

## 3) Current Week Summary
- Endpoint: `GET /api/ronyx/drivers/{driver_id}/current-week`
- Expected:
  - `200` with `driver`, `week`, `summary`, `items`

## Notes
- We currently log events to `ronyx_driver_events`.
- Audit logging table is not implemented yet in this Next.js stack.
