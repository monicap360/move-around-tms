# OCR Scan Edge Function

Supabase Edge Function for processing aggregate ticket images via OCR.

## Features

- 📸 Accepts image URL or base64 encoded image
- 🔍 Performs OCR text extraction
- 🏢 Auto-matches partner company using name or regex patterns
- 💰 Applies partner-specific rates and material adjustments
- 📊 Creates aggregate ticket with extracted data
- ✅ Returns structured ticket data

## Deploy

```bash
supabase functions deploy ocr-scan
```

## Usage

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/ocr-scan \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://storage.supabase.co/...",
    "driverId": "uuid-here",
    "fleetId": "uuid-here"
  }'
```

## Environment Variables

Set in Supabase Functions settings:

- `SUPABASE_URL` (auto-provided)
- `SUPABASE_SERVICE_ROLE_KEY` (auto-provided)

## OCR Provider Integration

Replace the `performOcr` function with your preferred OCR service:

### Google Vision API

```typescript
import { ImageAnnotatorClient } from "@google-cloud/vision";
```

### AWS Textract

```typescript
import {
  TextractClient,
  AnalyzeDocumentCommand,
} from "@aws-sdk/client-textract";
```

### Azure Computer Vision

```typescript
const endpoint = "https://YOUR_RESOURCE.cognitiveservices.azure.com/";
```

### Tesseract.js (open-source)

```typescript
import Tesseract from "tesseract.js";
```

## Partner Configuration

Partners are configured in the `aggregate_partners` table with:

- `regex_patterns` - JSONB patterns for field extraction
- `pay_rate` / `bill_rate` - Default rates
- `material_codes` - Material-specific rate overrides

Example regex patterns:

```json
{
  "company_hint": "Martin Marietta|MM Aggregates",
  "ticket_no": "Ticket\\s*#\\s*(\\w+)",
  "material": "Material\\s*:\\s*([^\\n]+)",
  "quantity": "(\\d+(?:\\.\\d+)?)\\s*(tons?|yards?)",
  "date": "(\\d{1,2}\\/\\d{1,2}\\/\\d{2,4})"
}
```
