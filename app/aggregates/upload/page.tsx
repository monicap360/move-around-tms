"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Upload, FileText, Image as ImageIcon } from "lucide-react";

export default function AggregateTicketUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleUpload() {
    try {
      if (!file) {
        alert("Please select a file first");
        return;
      }

      setLoading(true);
      setStatus("Uploading ticket...");
      setResult(null);

      // Upload to Supabase Storage aggregate-tickets bucket
      const path = `tickets/${new Date().toISOString().split('T')[0]}/${Date.now()}-${file.name}`;

      const { data: uploadRes, error: uploadErr } = await supabase.storage
        .from("aggregate-tickets") // Use the dedicated aggregate-tickets bucket
        .upload(path, file, { upsert: false, cacheControl: '3600' });

      if (uploadErr) {
        setStatus("❌ Upload failed: " + uploadErr.message);
        setLoading(false);
        return;
      }

      // Create a short-lived signed URL (works even if bucket is private)
      const { data: signed, error: signedErr } = await supabase.storage
        .from("aggregate-tickets")
        .createSignedUrl(uploadRes.path, 60 * 10); // 10 minutes

      if (signedErr || !signed?.signedUrl) {
        setStatus("❌ Failed to create signed URL");
        setLoading(false);
        return;
      }

      setStatus("🔍 Scanning ticket with OCR...");

      // Call unified OCR Edge Function with kind='ticket'
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ocr-scan`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ 
            kind: 'ticket', 
            file_url: signed.signedUrl 
          }),
        }
      );

      const ocr = await res.json();
      
      if (!res.ok) {
        setStatus("❌ Scan failed: " + (ocr?.message || res.statusText));
        setLoading(false);
        return;
      }

      setResult(ocr);
      setStatus("✅ Ticket scanned successfully!");
      setLoading(false);

    } catch (e: any) {
      setStatus("❌ Error: " + (e?.message || "Unexpected error"));
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Upload Aggregate Ticket</h1>
        <p className="text-gray-600">
          Scan aggregate delivery tickets (images or PDFs) to automatically extract partner, material, quantity, and driver info.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload & Scan Ticket
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Ticket File
            </label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="border border-gray-300 p-2 rounded-lg w-full file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {file && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  {file.type.startsWith('image/') ? (
                    <ImageIcon className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  <span className="truncate max-w-xs">{file.name}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Accepts: JPG, PNG, PDF, or any image format
            </p>
          </div>

          <Button
            onClick={handleUpload}
            disabled={!file || loading}
            className="w-full"
          >
            {loading ? "Processing..." : "Upload & Scan Ticket"}
          </Button>

          {status && (
            <div className={`p-4 rounded-lg ${
              status.includes('✅') ? 'bg-green-50 text-green-800' :
              status.includes('❌') ? 'bg-red-50 text-red-800' :
              'bg-blue-50 text-blue-800'
            }`}>
              <p className="font-medium">{status}</p>
            </div>
          )}

          {result && (
            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle className="text-lg">OCR Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {result.ticket && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="font-semibold">Partner:</span>{" "}
                          {result.ticket.partner_name || "Not detected"}
                        </div>
                        <div>
                          <span className="font-semibold">Ticket #:</span>{" "}
                          {result.ticket.ticket_number || "N/A"}
                        </div>
                        <div>
                          <span className="font-semibold">Material:</span>{" "}
                          {result.ticket.material || "N/A"}
                        </div>
                        <div>
                          <span className="font-semibold">Quantity:</span>{" "}
                          {result.ticket.quantity || "N/A"} {result.ticket.unit_type || ""}
                        </div>
                        <div>
                          <span className="font-semibold">Driver:</span>{" "}
                          {result.ticket.driver_name_ocr || "Not detected"}
                        </div>
                        <div>
                          <span className="font-semibold">Date:</span>{" "}
                          {result.ticket.ticket_date || "N/A"}
                        </div>
                      </div>
                      
                      {result.ticket.total_pay && (
                        <div className="pt-2 mt-2 border-t">
                          <span className="font-semibold">Calculated Pay:</span>{" "}
                          ${result.ticket.total_pay}
                        </div>
                      )}

                      <div className="pt-2 mt-2 border-t">
                        <span className="font-semibold">Status:</span>{" "}
                        <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
                          {result.ticket.status || "Pending Manager Review"}
                        </span>
                      </div>
                    </>
                  )}
                  
                  <details className="mt-4">
                    <summary className="cursor-pointer text-blue-600 hover:text-blue-700">
                      View Full JSON Response
                    </summary>
                    <pre className="mt-2 text-xs whitespace-pre-wrap bg-white p-3 rounded border overflow-x-auto">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </details>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 mb-2">📱 Scanning Tips:</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Take clear photos with good lighting</li>
            <li>Ensure all text is readable and not blurry</li>
            <li>PDFs work great for pre-scanned documents</li>
            <li>System auto-matches partner, driver, and calculates pay</li>
            <li>Manager can review and approve on the Admin Review page</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
