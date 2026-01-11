// MoveAround TMS — Driver Ops™
// Edge Function: driver_update_status
// Region: us-west-2
// Runtime: Deno

import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // ------------------------------
    // 1. AUTH
    // ------------------------------
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response("Missing authorization header", { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser(token);

    if (userErr || !user) {
      return new Response("Invalid or expired token", { status: 401 });
    }

    // ------------------------------
    // 2. INPUT DATA
    // ------------------------------
    const body = await req.json();

    const load_id = body.load_id;
    const new_status = body.status;
    const gps_lat = body.gps_lat || null;
    const gps_lng = body.gps_lng || null;

    if (!load_id || !new_status) {
      return new Response(
        JSON.stringify({ error: "load_id and status are required" }),
        { status: 400 },
      );
    }

    // ------------------------------
    // 3. DRIVER LOOKUP
    // ------------------------------
    const { data: driver } = await supabase
      .from("drivers")
      .select("id, organization_id")
      .eq("auth_user_id", user.id)
      .single();

    if (!driver) {
      return new Response("Driver profile not found", { status: 404 });
    }

    // ------------------------------
    // 4. VERIFY LOAD BELONGS TO DRIVER
    // ------------------------------
    const { data: load, error: loadErr } = await supabase
      .from("loads")
      .select("id, status, driver_id, organization_id")
      .eq("id", load_id)
      .eq("organization_id", driver.organization_id)
      .single();

    if (loadErr || !load) {
      return new Response("Load not found or not in your organization", {
        status: 404,
      });
    }

    if (load.driver_id !== driver.id) {
      return new Response("You are not assigned to this load", { status: 403 });
    }

    // ------------------------------
    // 5. OPTIONAL STATUS RULES
    // ------------------------------
    const allowed = [
      "assigned",
      "en_route",
      "arrived",
      "loading",
      "loaded",
      "delivering",
      "delivered",
      "completed",
    ];

    if (!allowed.includes(new_status)) {
      return new Response("Invalid status value", { status: 400 });
    }

    // ------------------------------
    // 6. UPDATE LOAD STATUS
    // ------------------------------
    const { error: updateErr } = await supabase
      .from("loads")
      .update({
        status: new_status,
        updated_at: new Date(),
      })
      .eq("id", load_id);

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 400,
      });
    }

    // ------------------------------
    // 7. INSERT STATUS HISTORY
    // ------------------------------
    const { error: insertErr } = await supabase
      .from("load_status_history")
      .insert({
        load_id,
        driver_id: driver.id,
        organization_id: driver.organization_id,
        status: new_status,
        gps_lat,
        gps_lng,
        timestamp: new Date(),
      });

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 400,
      });
    }

    return new Response(
      JSON.stringify({
        status: "success",
        load_id,
        new_status,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
});
