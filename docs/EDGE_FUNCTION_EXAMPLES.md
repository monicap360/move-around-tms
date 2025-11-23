# Edge Function API Examples

This document provides examples for calling the HR/Payroll Supabase Edge Function.

## Prerequisites

1. **Get your Supabase project URL and service key:**
   - Go to your Supabase project dashboard
   - Navigate to Settings → API
   - Copy your project URL (e.g., `https://xxxxx.supabase.co`)
   - Copy your `service_role` key (keep this secure!)

2. **Ensure the edge function is deployed:**
   ```bash
   supabase functions deploy hr-payroll
   ```

## Base URL

Replace `YOUR-PROJECT` with your actual Supabase project reference:

```
https://YOUR-PROJECT.supabase.co/functions/v1/hr-payroll
```

---

## Example 1: Generate Pay Stub

Generate a PDF pay stub for an employee's payroll entry.

### Request

```bash
curl -X POST https://YOUR-PROJECT.supabase.co/functions/v1/hr-payroll \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate_pay_stub",
    "employee_id": "123e4567-e89b-12d3-a456-426614174000",
    "pay_period_start": "2025-10-01",
    "pay_period_end": "2025-10-15",
    "total_hours": 80,
    "deductions": 100
  }'
```

### PowerShell Example

```powershell
$headers = @{
    "Authorization" = "Bearer YOUR_SERVICE_ROLE_KEY"
    "Content-Type" = "application/json"
}

$body = @{
    action = "generate_pay_stub"
    employee_id = "123e4567-e89b-12d3-a456-426614174000"
    pay_period_start = "2025-10-01"
    pay_period_end = "2025-10-15"
    total_hours = 80
    deductions = 100
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://YOUR-PROJECT.supabase.co/functions/v1/hr-payroll" `
  -Method POST `
  -Headers $headers `
  -Body $body `
  -OutFile "pay_stub.pdf"
```

### Response

- **Content-Type:** `application/pdf`
- **Body:** PDF binary data

---

## Example 2: Get Period Summary

Get aggregated payroll totals for all employees in a given month.

### Request

```bash
curl -X POST https://YOUR-PROJECT.supabase.co/functions/v1/hr-payroll \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get_period_summary",
    "period": "2025-10"
  }'
```

### PowerShell Example

```powershell
$headers = @{
    "Authorization" = "Bearer YOUR_SERVICE_ROLE_KEY"
    "Content-Type" = "application/json"
}

$body = @{
    action = "get_period_summary"
    period = "2025-10"
} | ConvertTo-Json

$result = Invoke-RestMethod -Uri "https://YOUR-PROJECT.supabase.co/functions/v1/hr-payroll" `
  -Method POST `
  -Headers $headers `
  -Body $body

$result | ConvertTo-Json -Depth 10
```

### Response

```json
{
  "data": [
    {
      "employee_id": "123e4567-e89b-12d3-a456-426614174000",
      "total_gross": 5000.00,
      "total_net": 4500.00
    },
    {
      "employee_id": "223e4567-e89b-12d3-a456-426614174001",
      "total_gross": 6000.00,
      "total_net": 5400.00
    }
  ]
}
```

---

## Example 3: Generate Employment Contract

Generate a PDF employment contract for an employee.

### Request

```bash
curl -X POST https://YOUR-PROJECT.supabase.co/functions/v1/hr-payroll \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate_contract",
    "employee_id": "123e4567-e89b-12d3-a456-426614174000",
    "position": "CDL Driver",
    "start_date": "2025-11-01",
    "hourly_rate": 25.00
  }'
```

### PowerShell Example

```powershell
$headers = @{
    "Authorization" = "Bearer YOUR_SERVICE_ROLE_KEY"
    "Content-Type" = "application/json"
}

$body = @{
    action = "generate_contract"
    employee_id = "123e4567-e89b-12d3-a456-426614174000"
    position = "CDL Driver"
    start_date = "2025-11-01"
    hourly_rate = 25.00
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://YOUR-PROJECT.supabase.co/functions/v1/hr-payroll" `
  -Method POST `
  -Headers $headers `
  -Body $body `
  -OutFile "contract.pdf"
```

### Response

- **Content-Type:** `application/pdf`
- **Body:** PDF binary data (employment contract)

---

## Security Notes

1. **Never commit your service role key** to version control
2. **Use environment variables** to store sensitive keys:
   ```bash
   export SUPABASE_SERVICE_KEY="your-key-here"
   ```
3. **Consider using anon key + RLS** for client-side calls instead of service key
4. **The service role key bypasses Row Level Security** - use with caution

---

## Testing in Development

When testing locally with `supabase start`:

```bash
# Local function URL
http://localhost:54321/functions/v1/hr-payroll

# Get local service key
supabase status
# Look for "service_role key" in the output
```

### Local Example

```bash
curl -X POST http://localhost:54321/functions/v1/hr-payroll \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get_period_summary",
    "period": "2025-10"
  }'
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required field: employee_id"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "error": "Employee not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Database query failed: [error message]"
}
```

---

## Integration with Your App

If calling from your Next.js app:

```typescript
// app/api/admin/generate-stub/route.ts
export async function POST(request: Request) {
  const body = await request.json();
  
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/hr-payroll`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'generate_pay_stub',
        ...body,
      }),
    }
  );

  if (response.ok && response.headers.get('content-type')?.includes('pdf')) {
    const pdfBuffer = await response.arrayBuffer();
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="pay_stub.pdf"',
      },
    });
  }

  const error = await response.json();
  return Response.json(error, { status: response.status });
}
```

---

## Additional Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Edge Function Deployment Guide](https://supabase.com/docs/guides/functions/deploy)
- Your edge function source: `supabase/functions/hr-payroll/index.ts`
