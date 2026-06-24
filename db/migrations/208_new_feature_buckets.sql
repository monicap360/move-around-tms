-- Migration 208: Create storage buckets for the 15 tables added in migration 207.
-- Already executed in Supabase on 2026-06-23. Recorded here for migration tracking.

do $$
begin
  if not exists (select 1 from storage.buckets where id = 'branding') then
    perform storage.create_bucket('branding', public := false);
  end if;

  if not exists (select 1 from storage.buckets where id = 'intel-verify-queue') then
    perform storage.create_bucket('intel-verify-queue', public := false);
  end if;

  if not exists (select 1 from storage.buckets where id = 'intel-verify-audit') then
    perform storage.create_bucket('intel-verify-audit', public := false);
  end if;

  if not exists (select 1 from storage.buckets where id = 'dvir') then
    perform storage.create_bucket('dvir', public := false);
  end if;

  if not exists (select 1 from storage.buckets where id = 'driver-layouts') then
    perform storage.create_bucket('driver-layouts', public := false);
  end if;

  if not exists (select 1 from storage.buckets where id = 'dispatch-messages') then
    perform storage.create_bucket('dispatch-messages', public := false);
  end if;

  if not exists (select 1 from storage.buckets where id = 'plants') then
    perform storage.create_bucket('plants', public := false);
  end if;

  if not exists (select 1 from storage.buckets where id = 'scans') then
    perform storage.create_bucket('scans', public := false);
  end if;

  if not exists (select 1 from storage.buckets where id = 'job-postings') then
    perform storage.create_bucket('job-postings', public := false);
  end if;

  if not exists (select 1 from storage.buckets where id = 'jobs') then
    perform storage.create_bucket('jobs', public := false);
  end if;

  if not exists (select 1 from storage.buckets where id = 'job-applications') then
    perform storage.create_bucket('job-applications', public := false);
  end if;

  if not exists (select 1 from storage.buckets where id = 'driver-incidents') then
    perform storage.create_bucket('driver-incidents', public := false);
  end if;

  if not exists (select 1 from storage.buckets where id = 'override-log') then
    perform storage.create_bucket('override-log', public := false);
  end if;

  if not exists (select 1 from storage.buckets where id = 'violations') then
    perform storage.create_bucket('violations', public := false);
  end if;

  if not exists (select 1 from storage.buckets where id = 'safety-records') then
    perform storage.create_bucket('safety-records', public := false);
  end if;
end;
$$;
