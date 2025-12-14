// Supabase Edge Function — Driver Upload Document
// Validates user, finds driver, validates load, uploads file, writes DB row.
// Returns public URL.

import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    // Must be a POST
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // Parse multipart form
    const formData = await req.formData();
    const load_id = formData.get("load_id")?.toString();
    const file = formData.get("file") as File | null;

    if (!load_id || !file) {
      return new Response(JSON.stringify({
        error: "load_id and file are required",
      }), { status: 400 });
    }

    // Validate file size (< 10MB recommended)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return new Response(JSON.stringify({
        error: "File too large. Max 10MB allowed.",
      }), { status: 400 });
    }

    // Validate allowed mime-types
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({
        error: "Invalid file type. Must be jpg, png, or pdf.",
      }), { status: 400 });
    }

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    // Supabase client (service role not needed)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Lookup driver from auth user
    const { data: driver, error: driverErr } = await supabase
      .from("drivers")
      .select("id, organization_id")
      .eq("auth_user_id", (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (driverErr || !driver) {
      return new Response(JSON.stringify({
        error: "Driver profile not found"
      }), { status: 403 });
    }

    // Construct storage path
    const ext = file.name.split(".").pop();
    const newName = `${crypto.randomUUID()}.${ext}`;

    const storagePath =
      `driver-documents/${driver.organization_id}/${driver.id}/${newName}`;

    // Upload to storage
    const { error: uploadErr } = await supabase.storage
      .from("driver-documents")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) {
      return new Response(JSON.stringify({ error: uploadErr.message }), { status: 400 });
    }

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from("driver-documents")
      .getPublicUrl(storagePath);

    // Insert record into DB
    const { error: insertErr } = await supabase
      .from("load_documents")
      .insert({
        load_id,
        driver_id: driver.id,
        organization_id: driver.organization_id,
        file_name: newName,
        file_url: publicUrl.publicUrl,
        mime_type: file.type,
        inserted_at: new Date(),
      });

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), { status: 400 });
    }

    return new Response(JSON.stringify({
      message: "Document uploaded successfully",
      url: publicUrl.publicUrl,
      file_name: newName,
      driver_id: driver.id,
      organization_id: driver.organization_id,
    }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message || "Unexpected error",
    }), { status: 500 });
  }
});
