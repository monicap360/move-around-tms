# driver_upload_document — Supabase Edge Function

Uploads a document for a load by an authenticated driver.

## Requirements
- Must be authenticated via Supabase Auth
- Driver must exist in `drivers` table with `auth_user_id`
- Storage bucket: `driver-documents`
- Table: `load_documents`

## Deployment

supabase functions deploy driver_upload_document --project-ref <project-id> --region us-west-2

## Usage (JS)

const form = new FormData();
form.append("load_id", "YOUR_LOAD_ID");
form.append("file", fileInput.files[0]);

await fetch(
  "https://<project>.functions.supabase.co/driver_upload_document",
  {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: form,
  }
);

🚀 Ready for Deployment

After saving these files, deploy with:

supabase functions deploy driver_upload_document --project-ref YOUR_PROJECT --region us-west-2

⭐ Next Functions I Can Generate

If you want, I will now produce:

driver_ack_load
driver_update_status
driver_send_message
driver_upload_ticket_image (OCR)
dispatch_create_load
dispatch_update_load
broker_offer_load

Just tell me:

“Generate next function.”

Which one do you want next?
