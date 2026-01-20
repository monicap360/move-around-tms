import { useState, useRef } from "react";
import Image from "next/image";
import { supabase } from "../lib/supabaseClient";

export default function DispatcherOCRPanel() {
  const directImageLoader = ({ src }: { src: string }) => src;
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ocrData, setOcrData] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Drag-and-drop upload handler
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) await uploadTicketImage(file);
  };
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadTicketImage(file);
  };
  const uploadTicketImage = async (file: File) => {
    setUploading(true);
    setMessage(null);
    try {
      // 1. Create ticket in DB
      const { data: ticket, error: ticketError } = await supabase
        .from("tickets")
        .insert({
          /* dispatcher can set driver_id, org_id, load_id as needed */
        })
        .select()
        .single();
      if (ticketError || !ticket) {
        setMessage("Ticket creation failed");
        setUploading(false);
        return;
      }
      setSelectedTicket(ticket);
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
      // 3. Get public URL for preview
      const { data } = supabase.storage
        .from("ronyx-files")
        .getPublicUrl(filePath);
      setImageUrl(data.publicUrl);
      setMessage("Processing OCR...");
      // 4. Subscribe to OCR realtime channel (pseudo, wire up with session token)
      // await supabase.realtime.setAuth(session.access_token);
      // const channel = supabase.channel(`ticket:${ticket.id}:ocr`, { config: { private: true } });
      // channel.on('broadcast', { event: 'ocr_completed' }, (payload) => {
      //   setOcrData(payload.data);
      //   setMessage("OCR Complete!");
      // }).subscribe();
    } catch (err: any) {
      setMessage("Error: " + (err.message || String(err)));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7F9]">
      <div className="flex flex-row w-full max-w-6xl mx-auto mt-8 gap-6">
        {/* Left: Upload + Preview */}
        <div className="flex-1 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-[#003F8A] mb-4">
            Upload Ticket
          </h2>
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer mb-4"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInput.current?.click()}
            style={{ minHeight: 180 }}
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInput}
              onChange={handleFileChange}
              disabled={uploading}
            />
            <span className="text-gray-400">
              Drag & drop or click to upload
            </span>
          </div>
          {imageUrl && (
            <Image
              src={imageUrl}
              alt="Ticket Preview"
              width={640}
              height={200}
              className="w-full rounded mb-2"
              style={{ maxHeight: 200, objectFit: "contain" }}
              loader={directImageLoader}
              unoptimized
            />
          )}
          {message && (
            <div className="text-green-700 text-center mb-2">{message}</div>
          )}
        </div>
        {/* Middle: Live OCR Output */}
        <div className="flex-1 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-[#003F8A] mb-4">OCR Output</h2>
          {ocrData ? (
            <div className="space-y-2">
              <div>
                <b>Ticket #:</b> {ocrData.ticket_number}
              </div>
              <div>
                <b>Material:</b> {ocrData.material_name}
              </div>
              <div>
                <b>Tons:</b> {ocrData.tons}
              </div>
              <div>
                <b>Price/Ton:</b> {ocrData.price_per_ton}
              </div>
              <div>
                <b>Total:</b> {ocrData.total_amount}
              </div>
              <div>
                <b>Plant:</b> {ocrData.plant_name}
              </div>
              <div>
                <b>Customer:</b> {ocrData.customer_name}
              </div>
              <div>
                <b>Confidence:</b> {ocrData.ocr_confidence}
              </div>
              <div>
                <b>Processed At:</b> {ocrData.processed_at}
              </div>
            </div>
          ) : (
            <div className="text-gray-400">No OCR data yet.</div>
          )}
        </div>
        {/* Right: Approve/Edit/Status */}
        <div className="flex-1 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-[#003F8A] mb-4">Actions</h2>
          <button
            className="w-full py-3 bg-[#005BBB] text-white rounded mb-2"
            disabled={!ocrData}
          >
            Approve Ticket
          </button>
          <button
            className="w-full py-3 bg-gray-200 text-gray-700 rounded"
            disabled={!ocrData}
          >
            Edit Fields
          </button>
        </div>
      </div>
      <div className="text-center text-xs text-gray-400 mt-8">
        Ronyx FastScan™ — Powered by MoveAround TMS
      </div>
    </div>
  );
}
