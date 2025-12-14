# HR Doc Scan Edge Function

OCR-based extraction for HR documents (Driver License, Medical Certificate) and auto-assignment to drivers.

## Deploy

```bash
supabase functions deploy hr-doc-scan
```

## Request

POST `https://<project-ref>.supabase.co/functions/v1/hr-doc-scan`

Body:
```json
{
  "imageUrl": "https://...",
  "driverId": "optional-uuid"
}
```

## Response

```json
{
  "ok": true,
  "document": { "id": "..." },
  "matched_driver": { "id": "...", "name": "...", "confidence": 95 }
}
```

## Notes
- Replace `performOcr` with your actual OCR provider.
- The function creates a row in `driver_documents` with status `Pending Manager Review`.
- Manager can approve/deny/edit via admin UI and APIs.
