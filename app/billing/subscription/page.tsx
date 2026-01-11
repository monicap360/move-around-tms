
"use client";
import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Button } from "../../components/ui/button";

const ADDONS = [
  { id: "extra_seats", label: "+5 User Seats", price: 199 },
  { id: "premium_support", label: "Premium Support", price: 99 },
  { id: "advanced_reports", label: "Advanced Reports", price: 149 },
];

export default function BillingSubscriptionPage() {
  const [selected, setSelected] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSelect = (id: string) => {
    setSelected(sel => sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpgrade = async () => {
    if (!file || selected.length === 0) return;
    setUploading(true);
    setError("");
    setSuccess(false);
    try {
      const user = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user : null;
      const userId = user?.id || "anonymous";
      const path = `zelle-upgrades/${userId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("billing").upload(path, file);
      if (uploadError) throw uploadError;
      // Insert a record in a 'payments' table for admin review
      await supabase.from("payments").insert({
        user_id: userId,
        file_url: path,
        status: "pending",
        type: "upgrade",
        addons: selected,
        created_at: new Date().toISOString(),
      });
      setSuccess(true);
      setFile(null);
      setSelected([]);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">Manage Subscription & Upgrades</h1>
      <div className="border rounded p-4 bg-white shadow mb-6">
        <h2 className="text-lg font-semibold mb-2">Upgrade/Add-Ons</h2>
        <ul className="mb-4">
          {ADDONS.map(a => (
            <li key={a.id} className="flex items-center mb-2">
              <input type="checkbox" id={a.id} checked={selected.includes(a.id)} onChange={() => handleSelect(a.id)} className="mr-2" />
              <label htmlFor={a.id} className="flex-1 cursor-pointer">{a.label} <span className="text-gray-500">(${a.price} one-time)</span></label>
            </li>
          ))}
        </ul>
        <div className="mb-2">Send the total amount for your selected upgrades to <span className="font-bold text-blue-700">Zelle 409-392-9626</span> and upload your payment screenshot below.</div>
        <input type="file" className="mb-2" accept="image/*,application/pdf" onChange={handleFileChange} />
        <Button onClick={handleUpgrade} disabled={!file || selected.length === 0 || uploading}>
          {uploading ? "Uploading..." : "Submit Upgrade Request"}
        </Button>
        {success && <div className="text-green-600 mt-2">Upgrade request submitted! Awaiting admin approval.</div>}
        {error && <div className="text-red-600 mt-2">{error}</div>}
      </div>
    </main>
  );
}
