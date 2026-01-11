// Supabase Edge Function — Driver Ack Load
// Driver acknowledges a load assignment
// RLS, organization_id, drivers.auth_user_id, loads.driver_id, broadcast triggers

import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const formData = await req.formData();
    const load_id = formData.get("load_id")?.toString();
    if (!load_id) {
      return new Response(JSON.stringify({ error: "Missing load_id" }), {
        status: 400,
      });
    }

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }
    const token = authHeader.replace("Bearer ", "");

    // Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );

    // Lookup driver
    const { data: driver, error: driverErr } = await supabase
      .from("drivers")
      .select("id, organization_id")
      .eq("auth_user_id", (await supabase.auth.getUser()).data.user?.id)
      .single();
    if (driverErr || !driver) {
      return new Response(JSON.stringify({ error: "Driver not found" }), {
        status: 403,
      });
    }

    // Lookup load
    const { data: load, error: loadErr } = await supabase
      .from("loads")
      .select("id, driver_id, organization_id, status")
      .eq("id", load_id)
      .eq("driver_id", driver.id)
      .eq("organization_id", driver.organization_id)
      .single();
    if (loadErr || !load) {
      return new Response(
        JSON.stringify({ error: "Load not found or not assigned to driver" }),
        { status: 404 },
      );
    }

    // Update load status to 'acknowledged'
    const { error: updateErr } = await supabase
      .from("loads")
      .update({ status: "acknowledged", acknowledged_at: new Date() })
      .eq("id", load_id)
      .eq("driver_id", driver.id)
      .eq("organization_id", driver.organization_id);
    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 400,
      });
    }

    // Broadcast trigger (optional, e.g., insert into load_status_history)
    await supabase.from("load_status_history").insert({
      load_id,
      driver_id: driver.id,
      organization_id: driver.organization_id,
      status: "acknowledged",
      changed_at: new Date(),
    });

    return new Response(
      JSON.stringify({
        message: "Load acknowledged",
        load_id,
        driver_id: driver.id,
        organization_id: driver.organization_id,
        status: "acknowledged",
      }),
      { status: 200 },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Unexpected error" }),
      { status: 500 },
    );
  }
});
