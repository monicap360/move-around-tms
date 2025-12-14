import { useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { v4 as uuidv4 } from "uuid";

export default function FastScanUpload() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      // Generate a ticket_id (UUID) for this upload
      const ticket_id = uuidv4();
      const filePath = `tickets/${ticket_id}/${file.name}`;
      // Upload to Supabase Storage (ronyx-files bucket)
      const { error } = await supabase.storage
        .from("ronyx-files")
        .upload(filePath, file, { upsert: false });
      if (error) {
        setMessage("Upload failed: " + error.message);
      } else {
        setMessage("Upload successful! OCR will process automatically.");
      }
    } catch (err: any) {
      setMessage("Error: " + (err.message || String(err)));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded shadow p-6 flex flex-col items-center">
      <h2 className="text-lg font-bold mb-2">Upload Ticket Image</h2>
      <input
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        ref={fileInput}
        onChange={handleFileChange}
        disabled={uploading}
      />
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded mb-2"
        onClick={() => fileInput.current?.click()}
        disabled={uploading}
      >
        {uploading ? "Uploading..." : "Select File"}
      </button>
      {message && <p className="text-xs text-green-600 dark:text-green-400 mt-2">{message}</p>}
      <p className="text-xs text-gray-500">Drag & drop or use your camera on mobile</p>
    </div>
  );
}
