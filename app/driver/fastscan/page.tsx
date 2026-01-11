"use client";

import { useState, useRef } from "react";
import FastScanSupportChat from "../../components/FastScanSupportChat";
import { supabase } from "../../lib/supabaseClient";
import toast from "react-hot-toast";

export default function DriverFastScan() {
  const [uploading, setUploading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<
    "idle" | "processing" | "complete"
  >("idle");
  const [success, setSuccess] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // One-tap camera upload handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setOcrStatus("processing");
    setSuccess(false);
    try {
      // 1. Auto-create ticket row
      const { data: userData } = await supabase.auth.getUser();
      const organizationId = userData?.user?.user_metadata?.organization_id;
      const userId = userData?.user?.id;
      const ticketNumber = `DRV-${Date.now().toString().slice(-8)}`;
      const { data: ticketRow, error: insertError } = await supabase
        .from("tickets") // FIXED TABLE NAME
        .insert([
          {
            ticket_number: ticketNumber,
            status: "pending",
            organization_id: organizationId,
            driver_id: userId,
          },
        ])
        .select()
        .single();
      if (insertError) throw insertError;
      const ticket_id = ticketRow.id;
      setTicketId(ticket_id);
      // 2. Upload file into correct folder inside bucket
      const path = `tickets/${ticket_id}/${file.name}`; // FIXED PATH
      const { error: uploadError } = await supabase.storage
        .from("ronyx-files")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      setImageUrl(URL.createObjectURL(file));
      // 3. Subscribe for OCR completion
      const channel = supabase.channel(`ticket:${ticket_id}:ocr`, {
        config: { private: true },
      });
      channel.on("broadcast", { event: "ocr_completed" }, () => {
        setOcrStatus("complete");
        setSuccess(true);
        toast.success("OCR complete!");
      });
      channel.subscribe();
    } catch (error) {
      toast.error("Upload failed.");
      setOcrStatus("idle");
    } finally {
      setUploading(false);
    }
  };

  const handleScanNext = () => {
    setOcrStatus("idle");
    setSuccess(false);
    setTicketId(null);
    setImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F6F7F9] px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 flex flex-col items-center">
        {/* ...existing Fast Scan UI... */}
      </div>
      <FastScanSupportChat />
    </div>
  );
}
