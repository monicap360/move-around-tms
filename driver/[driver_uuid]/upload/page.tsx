"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function DriverUploadPage({ params }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const driver_uuid = params.driver_uuid;
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function uploadTicket() {
    if (!file) return alert("Select a file first");
    setLoading(true);

    const filename = `${driver_uuid}/${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
      .from("ronyx-files")
      .upload(`tickets/${filename}`, file);

    setLoading(false);

    if (error) return alert("Upload failed");
    alert("Ticket uploaded — OCR is processing it.");
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Upload Ticket</h1>

      <input
        type="file"
        className="p-2 border rounded w-full"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <button
        onClick={uploadTicket}
        disabled={loading}
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
      >
        {loading ? "Uploading..." : "Upload Ticket"}
      </button>
    </div>
  );
}
