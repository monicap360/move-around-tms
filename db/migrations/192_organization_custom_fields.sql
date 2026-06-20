-- 192_organization_custom_fields.sql
-- Lets each customer org define extra fields on core entities without code changes.
-- Field definitions live here; actual values are stored as jsonb in each entity's
-- custom_fields column (added to entity tables via migration 193 schema patch).

CREATE TABLE IF NOT EXISTS public.organization_custom_fields (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type     text        NOT NULL,
  field_key       text        NOT NULL,
  label           text        NOT NULL,
  field_type      text        NOT NULL DEFAULT 'text',
  options         jsonb       NULL,
  placeholder     text        NULL,
  help_text       text        NULL,
  is_required     boolean     NOT NULL DEFAULT false,
  is_active       boolean     NOT NULL DEFAULT true,
  sort_order      integer     NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_ocf_org_entity_key UNIQUE (organization_id, entity_type, field_key),

  CONSTRAINT chk_ocf_entity_type CHECK (
    entity_type IN (
      'jobs','tickets','customers','drivers','trucks',
      'owner_operators','invoices','payroll_invoices','maintenance_work_orders'
    )
  ),
  CONSTRAINT chk_ocf_field_type CHECK (
    field_type IN ('text','number','date','dropdown','multi_select','checkbox','currency','attachment','formula')
  ),
  CONSTRAINT chk_ocf_label_len   CHECK (char_length(label) BETWEEN 1 AND 80),
  CONSTRAINT chk_ocf_key_format  CHECK (field_key ~ '^[a-z][a-z0-9_]{0,59}$')
);

CREATE INDEX IF NOT EXISTS idx_ocf_org        ON public.organization_custom_fields(organization_id);
CREATE INDEX IF NOT EXISTS idx_ocf_entity     ON public.organization_custom_fields(organization_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_ocf_active     ON public.organization_custom_fields(organization_id, entity_type, is_active);
CREATE INDEX IF NOT EXISTS idx_ocf_sort       ON public.organization_custom_fields(organization_id, entity_type, sort_order);

CREATE OR REPLACE FUNCTION public.set_ocf_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_ocf_updated_at ON public.organization_custom_fields;
CREATE TRIGGER trg_ocf_updated_at
  BEFORE UPDATE ON public.organization_custom_fields
  FOR EACH ROW EXECUTE FUNCTION public.set_ocf_updated_at();

ALTER TABLE public.organization_custom_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ocf_select_own_org" ON public.organization_custom_fields;
CREATE POLICY "ocf_select_own_org"
  ON public.organization_custom_fields FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_seats
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "ocf_insert_own_org" ON public.organization_custom_fields;
CREATE POLICY "ocf_insert_own_org"
  ON public.organization_custom_fields FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_seats
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "ocf_update_own_org" ON public.organization_custom_fields;
CREATE POLICY "ocf_update_own_org"
  ON public.organization_custom_fields FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_seats
      WHERE user_id = auth.uid() AND status = 'active'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_seats
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "ocf_delete_own_org" ON public.organization_custom_fields;
CREATE POLICY "ocf_delete_own_org"
  ON public.organization_custom_fields FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_seats
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
