// Supabase Edge Function: auto-expire-override.ts
// This function runs on a schedule (e.g., daily) to remove expired temporary overrides.
// It updates the subscriptions table and logs the removal in the override log.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req: Request) {
  // 1. Find all active temporary overrides that have expired
  const { data: overrides, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('override_type', 'temporary')
    .lte('override_expires_at', new Date().toISOString())
    .eq('override_active', true)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  if (!overrides || overrides.length === 0) {
    return new Response(JSON.stringify({ message: 'No expired overrides found.' }), { status: 200 })
  }

  // 2. For each expired override, deactivate and log
  for (const override of overrides) {
    // Deactivate override
    await supabase
      .from('subscriptions')
      .update({ override_active: false, override_type: null, override_expires_at: null })
      .eq('id', override.id)

    // Log the removal
    await supabase
      .from('override_log')
      .insert({
        organization_id: override.organization_id,
        action: 'auto-expire',
        override_type: 'temporary',
        removed_at: new Date().toISOString(),
        details: JSON.stringify({ subscription_id: override.id })
      })
  }

  return new Response(JSON.stringify({ message: `Expired overrides removed: ${overrides.length}` }), { status: 200 })
}
