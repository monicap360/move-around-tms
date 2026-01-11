import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function logAuditAction({ userId, action, details }) {
  // details: { [key: string]: any }
  const { error } = await supabase.from("audit_log").insert([
    {
      user_id: userId || null,
      action,
      details: details ? JSON.stringify(details) : null,
      timestamp: new Date().toISOString(),
    },
  ]);
  if (error) {
    // Optionally handle/log error
    // console.error('Audit log error:', error);
  }
}
