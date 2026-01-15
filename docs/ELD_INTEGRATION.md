# ELD Integration (MVP)

## Endpoint
`POST /api/integrations/eld/ping`

## Auth
Send header `x-api-key` using a key generated in **Settings → API Keys**.

## Payload
```json
{
  "provider": "samsara",
  "device_id": "device-123",
  "driver_id": "uuid",
  "truck_id": "uuid",
  "latitude": 32.78,
  "longitude": -96.8,
  "status": "In Transit",
  "timestamp": "2026-01-15T18:05:00Z"
}
```

## Behavior
- Stores last device position in `eld_device_status`.
- Writes tracking updates to `tracking_updates`.
- Runs geofence checks and logs events.
- If geofence rules include `detentionFacility: true`, entry/exit events
  create or close detention events automatically.

## Notes
- Add `rules.detentionFacility = true` to a geofence for auto-detention.
- Set `rules.autoClaim = true` later for auto-claim creation (next step).
