import { useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { v4 as uuidv4 } from "uuid";

export default function DriverFastScan() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<
    "idle" | "uploading" | "processing" | "complete"
  >("idle");
  const [ocrData, setOcrData] = useState<any>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Camera upload handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setOcrStatus("uploading");
    setMessage(null);
    try {
      // 1. Create ticket in DB
      const { data: ticket, error: ticketError } = await supabase
        .from("tickets")
        .insert({
          /* driver_id, organization_id, load_id: fill in from session/context */
        })
        .select()
        .single();
      if (ticketError || !ticket) {
        setMessage("Ticket creation failed");
        setUploading(false);
        return;
      }
      setTicketId(ticket.id);
      // 2. Upload image to Storage
      const filePath = `tickets/${ticket.id}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("ronyx-files")
        .upload(filePath, file, { upsert: false });
      if (uploadError) {
        setMessage("Upload failed: " + uploadError.message);
        setUploading(false);
        return;
      }
      setOcrStatus("processing");
      setMessage("Processing OCR...");
      // 3. Subscribe to OCR realtime channel
      // (Pseudo-code, wire up with session token and supabase.realtime)
      // await supabase.realtime.setAuth(session.access_token);
      // const channel = supabase.channel(`ticket:${ticket.id}:ocr`, { config: { private: true } });
      // channel.on('broadcast', { event: 'ocr_completed' }, (payload) => {
      //   setOcrData(payload.data);
      //   setOcrStatus("complete");
      //   setMessage("OCR Complete!");
      // }).subscribe();
    } catch (err: any) {
      setMessage("Error: " + (err.message || String(err)));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F6F7F9]">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6 flex flex-col items-center">
        <h1 className="text-2xl font-bold text-[#005BBB] mb-4">
          Ronyx FastScan™
        </h1>
        <p className="text-sm text-gray-500 mb-4">Powered by MoveAround TMS</p>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          ref={fileInput}
          onChange={handleFileChange}
          disabled={uploading}
        />
        <button
          className="w-full py-4 text-lg bg-[#005BBB] text-white rounded mb-4"
          onClick={() => fileInput.current?.click()}
          disabled={uploading || ocrStatus === "processing"}
        >
          {uploading
            ? "Uploading..."
            : ocrStatus === "processing"
              ? "Processing..."
              : "Scan Ticket (Camera)"}
        </button>
        {message && (
          <div className="text-green-700 text-center mb-2">{message}</div>
        )}
        {ocrStatus === "complete" && ocrData && (
          <div className="w-full mt-4">
            {/* Display extracted fields in large boxes */}
            <div className="bg-[#F6F7F9] rounded p-4 mb-2 text-lg">
              <span className="font-bold">Material:</span>{" "}
              {ocrData.material_name}
            </div>
            <div className="bg-[#F6F7F9] rounded p-4 mb-2 text-lg">
              <span className="font-bold">Tons:</span> {ocrData.tons}
            </div>
            <div className="bg-[#F6F7F9] rounded p-4 mb-2 text-lg">
              <span className="font-bold">Total:</span> ${ocrData.total_amount}
            </div>
            <div className="flex items-center justify-center mt-4">
              <span className="inline-block bg-green-500 text-white rounded-full px-4 py-2 text-lg font-bold">
                ✔ OCR Complete
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
