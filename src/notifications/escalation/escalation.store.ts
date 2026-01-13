// src/notifications/escalation/escalation.store.ts
import { EscalationRule } from "./escalation.types";
import { createSupabaseServerClient } from "../../lib/supabase/server";

// Fetch escalation rules from Supabase
export async function getEscalationRules(
  organizationId: string,
): Promise<EscalationRule[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("escalation_rules")
    .select("*")
    .eq("organizationId", organizationId);
  if (error) throw error;
  return data as EscalationRule[];
}

// Upsert escalation rules in Supabase
export async function setEscalationRules(
  organizationId: string,
  updates: EscalationRule[],
): Promise<void> {
  const supabase = createSupabaseServerClient();
  for (const update of updates) {
    const { error } = await supabase
      .from("escalation_rules")
      .upsert([{ ...update, organizationId }], {
        onConflict: ["organizationId", "severity"],
      });
    if (error) throw error;
  }
}
