import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: overrides, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("override_type", "temporary")
      .lte("override_expires_at", new Date().toISOString())
      .eq("override_active", true);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!overrides || overrides.length === 0) {
      return new Response(JSON.stringify({ message: "No expired overrides found." }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    for (const override of overrides) {
      await supabase
        .from("subscriptions")
        .update({ override_active: false, override_type: null, override_expires_at: null })
        .eq("id", override.id);

      await supabase.from("override_log").insert({
        organization_id: override.organization_id,
        action: "auto-expire",
        override_type: "temporary",
        removed_at: new Date().toISOString(),
        details: JSON.stringify({ subscription_id: override.id }),
      });
    }

    return new Response(
      JSON.stringify({ message: `Expired overrides removed: ${overrides.length}` }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
