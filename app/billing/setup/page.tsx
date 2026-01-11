
"use client";
import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Button } from "../../components/ui/button";

export default function BillingSetupPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<string | null>(null); // Placeholder for subscription status

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    setSuccess(false);
    try {
      const user = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user : null;
      const userId = user?.id || "anonymous";
      const path = `zelle-receipts/${userId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("billing").upload(path, file);
      if (uploadError) throw uploadError;
      // Optionally: Insert a record in a 'payments' table for admin review
      setSuccess(true);
      setFile(null);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">Setup Fee Payment</h1>
      <div className="border rounded p-4 bg-white shadow mb-6">
        <h2 className="text-xl font-semibold mb-2">How to Pay</h2>
        <ul className="list-disc pl-6 mb-4">
          <li><span className="font-bold">Zelle:</span> <span className="text-blue-700">409-392-9626</span></li>
        </ul>
        <p className="mb-2">Send your setup fee to the Zelle number above. After payment, upload your receipt or screenshot below. Your account will be unlocked once payment is verified by our team.</p>
        <input type="file" className="mb-4" accept="image/*,application/pdf" onChange={handleFileChange} />
        <Button onClick={handleUpload} disabled={!file || uploading}>
          {uploading ? "Uploading..." : "Upload Receipt"}
        </Button>
        {success && <div className="text-green-600 mt-2">Receipt uploaded! Awaiting admin verification.</div>}
        {error && <div className="text-red-600 mt-2">{error}</div>}
      </div>
      <div className="border rounded p-4 bg-white shadow">
        <h2 className="text-lg font-semibold mb-2">Subscription Status</h2>
        <p className="mb-2">Current status: <span className="font-bold">{status || "Pending verification"}</span></p>
        {/* TODO: Fetch and display real status from Supabase */}
      </div>
    </main>
  );
}
