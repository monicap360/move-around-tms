-- 199_excel_file_registry.sql
-- Tracks Excel files uploaded by org staff for storage and reference.
-- Auto-generated live exports are NOT stored here — only user-uploaded files.

CREATE TABLE IF NOT EXISTS public.org_excel_files (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_name        text        NOT NULL,
  storage_path     text        NOT NULL,
  file_size_bytes  bigint      NULL,
  data_type        text        NOT NULL DEFAULT 'custom',
  description      text        NULL,
  uploaded_by      uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_by_name text        NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_oef_data_type CHECK (
    data_type IN ('tickets','drivers','trucks','owner_operators','payroll','customers','dispatch','custom')
  )
);

CREATE INDEX IF NOT EXISTS idx_oef_org      ON public.org_excel_files(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_oef_type     ON public.org_excel_files(organization_id, data_type);

ALTER TABLE public.org_excel_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "oef_own_org" ON public.org_excel_files
  USING (organization_id IN (
    SELECT organization_id FROM public.user_seats
    WHERE user_id = auth.uid() AND status = 'active'
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.user_seats
    WHERE user_id = auth.uid() AND status = 'active'
  ));
