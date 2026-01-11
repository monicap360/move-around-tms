"use client";

import { useState, useRef } from "react";
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
        <h1 className="text-2xl font-bold text-[#005BBB] mb-2">
          Ronyx FastScan™
        </h1>
        <p className="text-[#003F8A] mb-6 text-center">
          Powered by MoveAround TMS
        </p>
        {ocrStatus === "idle" && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              className="w-full py-4 bg-[#005BBB] text-white rounded-lg text-lg font-semibold mb-4"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Scan Ticket (Camera)"}
            </button>
          </>
        )}
        {ocrStatus === "processing" && (
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Ticket"
                  className="object-contain w-full h-full rounded"
                />
              )}
            </div>
            <div className="text-[#005BBB] font-semibold text-lg mb-2">
              Processing OCR…
            </div>
            <div className="w-8 h-8 border-4 border-blue-200 border-t-[#005BBB] rounded-full animate-spin mb-2"></div>
            <div className="text-gray-500 text-sm">Please wait…</div>
          </div>
        )}
        {ocrStatus === "complete" && success && (
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 bg-green-100 rounded-lg mb-4 flex items-center justify-center">
              <svg
                className="w-16 h-16 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="text-green-700 font-bold text-lg mb-2">
              Success!
            </div>
            <div className="text-gray-600 mb-4">
              Ticket scanned and uploaded.
            </div>
            <button
              className="w-full py-3 bg-[#005BBB] text-white rounded-lg text-lg font-semibold"
              onClick={handleScanNext}
            >
              Scan Next Ticket
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
