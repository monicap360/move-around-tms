-- 229_ai_operations_audit_log.sql
-- Audit trail for "Rory — Operations Manager" (read-only AI ops assistant).
-- One row per tool invocation (and per failed/blocked attempt), org-scoped.
--
-- Modeled on the audit_logs precedent (174_missing_tables.sql) with the newer
-- service-role-write + current_user_org() read posture (228_ccb_monitoring_and_reviews.sql).
-- Column is organization_id (not org_id) to match the rest of the schema and the
-- public.current_user_org() RLS helper used everywhere else.

CREATE TABLE IF NOT EXISTS public.ai_operations_audit_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id           uuid,                 -- authenticated user (nullable in demo / single-tenant mode)
  user_email        text,
  conversation_id   text,                 -- client-supplied chat/session id (groups a Q&A thread)
  question          text,                 -- the staff question that triggered this tool call
  tool_name         text,                 -- which read-only tool was invoked (null for a blocked/no-tool turn)
  tool_input_json   jsonb,                -- validated tool input (no secrets; org_id never accepted from client)
  result_count      integer,             -- number of rows the tool returned (0 = no matching records)
  response_status   text NOT NULL DEFAULT 'ok',  -- ok | tool_error | blocked | rate_limited | model_error | no_data_source
  error_detail      text,                 -- short, safe error string (never raw secrets/PII)
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aoal_org      ON public.ai_operations_audit_log (organization_id);
CREATE INDEX IF NOT EXISTS idx_aoal_created  ON public.ai_operations_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aoal_user     ON public.ai_operations_audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_aoal_convo    ON public.ai_operations_audit_log (conversation_id);

-- RLS: enabled. Writes happen server-side via the service role (which bypasses RLS),
-- so we only add an org-scoped SELECT policy for any authenticated client read
-- (e.g. an admin audit viewer). No INSERT/UPDATE/DELETE policy → clients cannot
-- forge audit rows; only the service role can write.
ALTER TABLE public.ai_operations_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aoal_select" ON public.ai_operations_audit_log;
CREATE POLICY "aoal_select" ON public.ai_operations_audit_log
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org());

COMMENT ON TABLE public.ai_operations_audit_log IS
  'Audit log for Rory (Operations Manager) AI assistant: one row per read-only tool invocation or blocked attempt. Service-role write, org-scoped read.';
