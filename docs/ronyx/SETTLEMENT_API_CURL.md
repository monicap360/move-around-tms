# Settlement API Curl Tests (Next.js)

## Test ticket processing
```bash
curl -X POST \
  http://your-domain.com/api/ronyx/drivers/245/process-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "load_id": 14287,
    "ticket_number": "VTK77891",
    "net_tons": 22.0,
    "material_type": "#57 Gravel",
    "customer_id": 55,
    "equipment_used": "Truck+Trailer"
  }'
```

## Test weekly summary
```bash
curl -X GET \
  http://your-domain.com/api/ronyx/drivers/245/current-week
```
