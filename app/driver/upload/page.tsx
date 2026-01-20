"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

export default function DriverUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [canUpload, setCanUpload] = useState(false);
  const [driverId, setDriverId] = useState<string>("");
  const [currentWeekStart, setCurrentWeekStart] = useState("");
  const [currentWeekEnd, setCurrentWeekEnd] = useState("");

  useEffect(() => {
    checkUploadPermission();
  }, []);

  async function checkUploadPermission() {
    try {
      // Calculate current pay week (Friday-anchored)
      const today = new Date();
      const dayOfWeek = today.getDay();
      const daysSinceFriday = (dayOfWeek + 2) % 7;
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - daysSinceFriday);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      setCurrentWeekStart(weekStart.toISOString().split("T")[0]);
      setCurrentWeekEnd(weekEnd.toISOString().split("T")[0]);

      // Check if today is within the pay week
      const isInPayWeek = today >= weekStart && today <= weekEnd;
      setCanUpload(isInPayWeek);

      // Get current driver ID
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: driver } = await supabase
          .from("drivers")
          .select("id")
          .eq("email", user.email)
          .single();

        if (driver) {
          setDriverId(driver.id);
        }
      }
    } catch (err) {
      console.error("Error checking upload permission:", err);
    }
  }

  async function handleUpload() {
    if (!canUpload) {
      alert(
        "❌ You can only upload tickets during the current pay week (Friday to Thursday).",
      );
      return;
    }

    try {
      if (!file) {
        alert("Please select a file first");
        return;
      }

      setLoading(true);
      setStatus("Uploading ticket...");
      setResult(null);

      // Upload to Supabase Storage
      const path = `tickets/${currentWeekStart}/${Date.now()}-${file.name}`;

      const { data: uploadRes, error: uploadErr } = await supabase.storage
        .from("hr_docs")
        .upload(path, file, { upsert: false, cacheControl: "3600" });

      if (uploadErr) {
        setStatus("❌ Upload failed: " + uploadErr.message);
        setLoading(false);
        return;
      }

      // Create signed URL
      const { data: signed, error: signedErr } = await supabase.storage
        .from("hr_docs")
        .createSignedUrl(uploadRes.path, 60 * 10);

      if (signedErr || !signed?.signedUrl) {
        setStatus("❌ Failed to create signed URL");
        setLoading(false);
        return;
      }

      setStatus("🔍 Scanning ticket with OCR...");

      // Call OCR Edge Function
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ocr-scan`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            kind: "ticket",
            file_url: signed.signedUrl,
            driverId: driverId || undefined,
          }),
        },
      );

      const ocr = await res.json();

      if (!res.ok) {
        setStatus("❌ Scan failed: " + (ocr?.message || res.statusText));
        setLoading(false);
        return;
      }

      // Verify ticket date is within current pay week
      if (ocr.ticket?.ticket_date) {
        const ticketDate = new Date(ocr.ticket.ticket_date);
        const weekStart = new Date(currentWeekStart);
        const weekEnd = new Date(currentWeekEnd);

        if (ticketDate < weekStart || ticketDate > weekEnd) {
          setStatus(
            "⚠️ Warning: Ticket date is outside current pay week. Manager review required.",
          );
        } else {
          setStatus("✅ Ticket uploaded successfully!");
        }
      } else {
        setStatus("✅ Ticket uploaded successfully!");
      }

      setResult(ocr);
      setLoading(false);
    } catch (e: any) {
      setStatus("❌ Error: " + (e?.message || "Unexpected error"));
      setLoading(false);
    }
  }

  if (!canUpload) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 mt-0.5" />
              <div>
                <h2 className="text-xl font-bold text-red-900 mb-2">
                  Upload Restricted
                </h2>
                <p className="text-red-800 mb-2">
                  You can only upload tickets during the current pay week
                  (Friday to Thursday).
                </p>
                <p className="text-sm text-red-700">
                  Current pay week: <strong>{currentWeekStart}</strong> to{" "}
                  <strong>{currentWeekEnd}</strong>
                </p>
                <p className="text-sm text-red-700 mt-2">
                  Please wait until the next pay week starts to upload tickets.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Upload Ticket</h1>
        <p className="text-gray-600">
          Upload delivery tickets for the current pay week:{" "}
          <strong>{currentWeekStart}</strong> to{" "}
          <strong>{currentWeekEnd}</strong>
        </p>
      </div>

      <Card className="mb-6">
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
                  {file.type.startsWith("image/") ? (
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
            <div
              className={`p-4 rounded-lg ${
                status.includes("✅")
                  ? "bg-green-50 text-green-800"
                  : status.includes("❌")
                    ? "bg-red-50 text-red-800"
                    : status.includes("⚠️")
                      ? "bg-orange-50 text-orange-800"
                      : "bg-blue-50 text-blue-800"
              }`}
            >
              <p className="font-medium">{status}</p>
            </div>
          )}

          {result && (
            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Ticket Processed
                </CardTitle>
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
                          {result.ticket.quantity || "N/A"}{" "}
                          {result.ticket.unit_type || ""}
                        </div>
                        <div>
                          <span className="font-semibold">Date:</span>{" "}
                          {result.ticket.ticket_date || "N/A"}
                        </div>
                        <div>
                          <span className="font-semibold">Pay:</span> $
                          {result.ticket.total_pay || "0.00"}
                        </div>
                      </div>

                      <div className="pt-2 mt-2 border-t">
                        <span className="font-semibold">Status:</span>{" "}
                        <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
                          Pending Manager Review
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 mt-3">
                        Your ticket has been submitted and will appear in your
                        profile once approved by a manager.
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 mb-2">📱 Upload Tips:</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>
              Only upload tickets from the current pay week (Friday-Thursday)
            </li>
            <li>Take clear photos with good lighting</li>
            <li>Ensure ticket number and material type are visible</li>
            <li>
              Tickets go to &quot;Pending Manager Review&quot; before counting
              toward your pay
            </li>
            <li>
              You can also text photos to: <strong>(555) 123-4567</strong>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
