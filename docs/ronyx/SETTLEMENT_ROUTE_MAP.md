# Settlement Route Map (Next.js)

This maps the Laravel route plan to the current Next.js API endpoints.

## Base Prefix
Suggested: `/api/ronyx/settlement` (not yet created).  
Current endpoints use `/api/ronyx` and `/api/settlement`.

## Driver Ticket Processing
- Laravel: `POST /api/v1/settlement/drivers/{driver}/process-ticket`
- Next.js: `POST /api/ronyx/drivers/{driver_id}/process-ticket`

## Get Current Week Settlement
- Laravel: `GET /api/v1/settlement/drivers/{driver}/current-week`
- Next.js: `GET /api/ronyx/drivers/{driver_id}/current-week`

## Submit Dispute
- Laravel: `POST /api/v1/settlement/settlement-items/{item}/dispute`
- Next.js: `POST /api/settlement/dispute`

## Office: Lock Week (Not implemented yet)
- Laravel: `POST /api/v1/settlement/drivers/{driver}/lock-week`
- Next.js: (pending) `POST /api/ronyx/drivers/{driver_id}/lock-week`

## Office: Payroll Exports (Not implemented yet)
- Laravel: `GET /api/v1/settlement/exports/payroll/{week}`
- Next.js: (pending) `GET /api/ronyx/settlement/exports/payroll/{week}`

## Office: QuickBooks Export (Not implemented yet)
- Laravel: `GET /api/v1/settlement/exports/quickbooks/{week}`
- Next.js: (pending) `GET /api/ronyx/settlement/exports/quickbooks/{week}`
