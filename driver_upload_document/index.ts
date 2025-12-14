// MoveAround TMS — Driver Ops™
// Edge Function: driver_upload_document
// Region: us-west-2
// Runtime: Deno

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    // 1. AUTH
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response("Missing authorization header", { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!, // secure + RLS bypass
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser(token);

    if (userErr || !user) {
      return new Response("Invalid or expired token", { status: 401 });
    }

    // 2. PARSE MULTIPART
    const form = await req.formData();
    const load_id = form.get("load_id")?.toString();
    const file = form.get("file") as File;

    if (!load_id) {
      return new Response("Missing load_id", { status: 400 });
    }
    if (!file) {
      return new Response("Missing file upload", { status: 400 });
    }

    // 3. FILE VALIDATION
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      return new Response("Invalid file type", { status: 400 });
    }

    const MAX_SIZE = 15 * 1024 * 1024; // 15MB
    if (file.size > MAX_SIZE) {
      return new Response("File too large (max 15MB)", { status: 413 });
    }

    // 4. LOOKUP DRIVER
    const { data: driver } = await supabase
      .from("drivers")
      .select("id, organization_id")
      .eq("auth_user_id", user.id)
      .single();

    if (!driver) {
      return new Response("Driver profile not found", { status: 404 });
    }

    // 5. GENERATE UNIQUE FILE PATH
    const ext = file.name.split(".").pop();
    const unique = crypto.randomUUID();
    const path = `driver-documents/${driver.organization_id}/${driver.id}/${unique}.${ext}`;

    // 6. UPLOAD
    const { error: uploadError } = await supabase.storage
      .from("driver-documents")
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return new Response(`Upload failed: ${uploadError.message}`,
        { status: 500 });
    }

    // 7. INSERT METADATA
    const { error: insertErr, data: doc } = await supabase
      .from("load_documents")
      .insert({
        load_id,
        driver_id: driver.id,
        organization_id: driver.organization_id,
        file_path: path,
        file_type: file.type,
        file_size: file.size,
      })
      .select()
      .single();

    if (insertErr) {
      return new Response(`Database insert error: ${insertErr.message}`,
        { status: 500 });
    }

    // 8. PUBLIC URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("driver-documents").getPublicUrl(path);

    return new Response(
      JSON.stringify({
        status: "success",
        message: "Document uploaded",
        url: publicUrl,
        file_id: doc.id,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(`Unexpected error: ${err.message}`, { status: 500 });
  }
});
