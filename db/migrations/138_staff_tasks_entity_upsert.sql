-- 138_staff_tasks_entity_upsert.sql
-- Adds entity_type + entity_id to ronyx_staff_tasks so dispatch-generated
-- tasks (loads, tickets, trucks, drivers, pits) have a deterministic unique
-- key and can be inserted with true ON CONFLICT upsert semantics.
--
-- Before this migration, dedup was best-effort (app-level check only) for
-- anything that wasn't an OO/COI task. Now every open task is guaranteed
-- unique per (entity_type, entity_id, task_type).
--
-- Usage in application code:
--   INSERT INTO ronyx_staff_tasks (entity_type, entity_id, task_type, ...)
--   VALUES ('load', '<load_id>', 'ticket_missing', ...)
--   ON CONFLICT (entity_type, entity_id, task_type)
--   WHERE (status = 'open' AND entity_type IS NOT NULL AND entity_id IS NOT NULL)
--   DO UPDATE SET
--     title       = EXCLUDED.title,
--     priority    = EXCLUDED.priority,
--     description = EXCLUDED.description,
--     updated_at  = now();
--
-- Supported entity_type values:
--   'load'    — tied to a dispatch load / ticket row
--   'ticket'  — fast-scan ticket record
--   'truck'   — fleet unit
--   'driver'  — driver profile
--   'pit'     — pit/plant site
--   'oo'      — owner-operator (backfilled from existing COI tasks)
--   'billing' — invoice / billing hold
--   'payroll' — payroll hold record

alter table public.ronyx_staff_tasks
  add column if not exists entity_type  text,
  add column if not exists entity_id    text;

comment on column public.ronyx_staff_tasks.entity_type is
  'Entity class driving this task: load | ticket | truck | driver | pit | oo | billing | payroll';
comment on column public.ronyx_staff_tasks.entity_id   is
  'UUID or string ID of the linked entity. Stored as text to support any ID format.';

-- ── Deterministic unique key ────────────────────────────────────────────────
-- One open task per (entity_type, entity_id, task_type).
-- Partial: only rows that actually have entity fields set are covered
-- (COI-only rows without entity_type remain covered by the existing index).
create unique index if not exists ronyx_staff_tasks_entity_dedup_idx
  on public.ronyx_staff_tasks (entity_type, entity_id, task_type)
  where status = 'open'
    and entity_type is not null
    and entity_id   is not null;

-- ── Backfill existing COI / OO tasks ───────────────────────────────────────
update public.ronyx_staff_tasks
  set entity_type = 'oo',
      entity_id   = owner_operator_id::text
where entity_type      is null
  and owner_operator_id is not null;

-- ── Supporting lookup index ─────────────────────────────────────────────────
create index if not exists ronyx_staff_tasks_entity_lookup_idx
  on public.ronyx_staff_tasks (entity_type, entity_id)
  where entity_type is not null;
