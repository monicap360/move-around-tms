// Fire-and-forget audit writer for Rory. Mirrors the house pattern (routes insert
// directly via the service role; logging never blocks the response). Every tool
// invocation and every blocked/failed attempt is recorded, org-scoped.

import type { SupabaseClient } from "@supabase/supabase-js";

export type RoryAuditEntry = {
  organization_id: string;
  user_id?: string | null;
  user_email?: string | null;
  conversation_id?: string | null;
  question?: string | null;
  tool_name?: string | null;
  tool_input_json?: unknown;
  result_count?: number | null;
  response_status: string; // ok | tool_error | blocked | rate_limited | model_error | no_data_source
  error_detail?: string | null;
};

export function logRoryAudit(sb: SupabaseClient, entry: RoryAuditEntry): void {
  // Never persist secrets; tool inputs are already validated/whitelisted and org
  // id is server-resolved (never echoed from the client body).
  void (sb as any)
    .from("ai_operations_audit_log")
    .insert({
      organization_id: entry.organization_id,
      user_id: entry.user_id ?? null,
      user_email: entry.user_email ?? null,
      conversation_id: entry.conversation_id ?? null,
      question: entry.question ?? null,
      tool_name: entry.tool_name ?? null,
      tool_input_json: entry.tool_input_json ?? null,
      result_count: entry.result_count ?? null,
      response_status: entry.response_status,
      error_detail: entry.error_detail ?? null,
    })
    .then(
      () => {},
      () => {}, // swallow — audit failure must not break the response
    );
}
