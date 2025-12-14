# driver_update_status — Supabase Edge Function

Allows authenticated drivers to update their assigned load status.

## Requirements
- Must be authenticated via Supabase Auth
- Load must belong to driver and organization
- Table: loads
- Table: load_status_history

## Deploy
supabase functions deploy driver_update_status --project-ref YOUR_PROJECT --region us-west-2

🚀 Deployment Command

Replace YOUR_PROJECT with your actual project-ref:

supabase functions deploy driver_update_status --project-ref <project-id> --region us-west-2

🎉 NEXT STEPS

After this, the next best functions to build are:

✔ driver_send_message
✔ driver_upload_ticket_image (OCR)
✔ dispatch_create_load
✔ dispatch_update_load
✔ broker_offer_load

Just say:

👉 Generate next function

Or name the one you want:

driver_send_message, broker_offer_load, etc.
