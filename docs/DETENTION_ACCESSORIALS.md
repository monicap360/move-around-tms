# Detention & Accessorials Tracking

## What’s Implemented (MVP)
- Detention event capture with arrival/departure timestamps.
- Auto-claim generation from closed events.
- Policy defaults per organization (free minutes + hourly rate).
- Manual claim entry for back-office reconciliation.
- API endpoints for events and claims.

## Data Model
- `detention_policies` – org-level defaults (free minutes, rate).
- `detention_events` – facility arrival/departure captured from geofences or manual entry.
- `detention_claims` – billable detention claims with status lifecycle.

## API
- `GET /api/detention/events`
- `POST /api/detention/events`
- `PATCH /api/detention/events` (close event + optionally create claim)
- `GET /api/detention/claims`
- `POST /api/detention/claims`

## UI
- `/detention` for event capture, manual claims, and status lists.

## Next Enhancements
- Link events to real ELD/telematics pings.
- OCR ingestion for gate photos to auto-verify arrival times (wired).
- Facility wait-time scoring and automated dispute workflows.

## OCR Wiring
- Upload detention photos to `detention/<detention_event_id>/filename.jpg`
- Storage webhook calls OCR with `kind: "detention"` and stores results in:
  - `detention_events.metadata.detention_ocr`
  - `detention_claims.evidence.detention_ocr`

## Detention Photo Upload
- UI upload available in `/detention`
- API endpoint: `POST /api/detention/upload-photo`
