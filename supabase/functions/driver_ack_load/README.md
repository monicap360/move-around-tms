# driver_ack_load — Supabase Edge Function

Driver acknowledges a load assignment.

## Requirements

- Must be authenticated via Supabase Auth
- Driver must exist in `drivers` table with `auth_user_id`
- Load must exist in `loads` table and be assigned to driver
- Storage bucket: n/a
- Table: `loads`, `load_status_history`

## Deployment

supabase functions deploy driver_ack_load --project-ref <project-id> --region us-west-2

## Usage (JS)

const form = new FormData();
form.append("load_id", "YOUR_LOAD_ID");

await fetch(
"https://<project>.functions.supabase.co/driver_ack_load",
{
method: "POST",
headers: { Authorization: `Bearer ${session.access_token}` },
body: form,
}
);

🚀 Ready for Deployment

After saving these files, deploy with:

supabase functions deploy driver_ack_load --project-ref YOUR_PROJECT --region us-west-2
