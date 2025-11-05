"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, AlertTriangle, Calendar } from "lucide-react";

type PayWeek = {
  label: string;
  start: string;
  end: string;
  isCurrent: boolean;
};

export default function MissingTicketUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [driverId, setDriverId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [availableWeeks, setAvailableWeeks] = useState<PayWeek[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<PayWeek | null>(null);

  useEffect(() => {
    loadDriverAndWeeks();
  }, []);

  async function loadDriverAndWeeks() {
    try {
      // Get current driver
      const { data: { user } } = await supabase.auth.getUser();
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

      // Calculate current and last pay weeks (Friday-anchored)
      const today = new Date();
      const weeks: PayWeek[] = [];

      for (let i = 0; i <= 1; i++) {
        const referenceDate = new Date(today);
        referenceDate.setDate(today.getDate() - (i * 7));
        
        const dayOfWeek = referenceDate.getDay();
        const daysSinceFriday = (dayOfWeek + 2) % 7;
        const weekStart = new Date(referenceDate);
        weekStart.setDate(referenceDate.getDate() - daysSinceFriday);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        weeks.push({
          label: i === 0 ? "Current Week" : "Last Week",
          start: weekStart.toISOString().split('T')[0],
          end: weekEnd.toISOString().split('T')[0],
          isCurrent: i === 0,
        });
      }

      setAvailableWeeks(weeks);
      setSelectedWeek(weeks[0]); // Default to current week
    } catch (err) {
      console.error("Error loading weeks:", err);
    }
  }

  async function handleUpload() {
    try {
      if (!file) {
        alert("Please select a file");
        return;
      }

      if (!selectedWeek) {
        alert("Please select a pay week");
        return;
      }

      if (!reason.trim()) {
        alert("Please provide a reason for the missing ticket");
        return;
      }

      setLoading(true);
      setStatus("Uploading missing ticket...");
      setResult(null);

      // Upload to special "missing_tickets" folder
      const path = `missing_tickets/${selectedWeek.start}/${Date.now()}-${file.name}`;

      const { data: uploadRes, error: uploadErr } = await supabase.storage
        .from("hr_docs")
        .upload(path, file, { upsert: false, cacheControl: '3600' });

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

      setStatus("🔍 Scanning ticket with AI date analysis...");

      // Call OCR with special flag for missing ticket
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
            file_url: signed.signedUrl,
            driverId: driverId || undefined,
            missingTicket: true,
            targetWeek: selectedWeek,
            reason: reason,
          }),
        }
      );

      const ocr = await res.json();

      if (!res.ok) {
        setStatus("❌ Scan failed: " + (ocr?.message || res.statusText));
        setLoading(false);
        return;
      }

      // Send manager notification
      await notifyManager(ocr.ticket);

      setResult(ocr);
      setStatus("✅ Missing ticket submitted! Manager has been notified for approval.");
      setLoading(false);

    } catch (e: any) {
      setStatus("❌ Error: " + (e?.message || "Unexpected error"));
      setLoading(false);
    }
  }

  async function notifyManager(ticketData: any) {
    try {
      // Create notification for managers
      const message = `🚨 Missing Ticket Alert: ${ticketData?.driver_name_ocr || "Driver"} submitted a missing ticket from ${selectedWeek?.label}. Reason: ${reason}. Requires approval.`;

      await supabase.from("notifications").insert({
        message,
        metadata: {
          type: "missing_ticket",
          ticket_id: ticketData?.id,
          driver_id: driverId,
          target_week: selectedWeek,
          reason: reason,
        },
      });
    } catch (err) {
      console.error("Error notifying manager:", err);
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-8 h-8 text-orange-500" />
          Report Missing Ticket
        </h1>
        <p className="text-gray-600">
          Submit a ticket you forgot to upload during the pay week. Manager approval required.
        </p>
      </div>

      <Card className="border-orange-200 bg-orange-50 mb-6">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
            <div className="text-sm text-orange-800">
              <p className="font-semibold mb-1">Missing Ticket Policy:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>You can report tickets from current or last pay week only</li>
                <li>Must provide a valid reason (forgot to upload, system error, etc.)</li>
                <li>Requires manager approval before counting toward payroll</li>
                <li>AI will analyze ticket date and reconcile with material plant records</li>
                <li>Manager can approve, deny, or void the ticket</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Select Pay Week
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableWeeks.map((week, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedWeek(week)}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedWeek?.start === week.start
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{week.label}</p>
                    <p className="text-sm text-gray-600">
                      {week.start} to {week.end}
                    </p>
                  </div>
                  {week.isCurrent && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                      Current
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Missing Ticket *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Example: Forgot to upload at end of shift, system was down, misplaced ticket and found it later..."
              className="w-full border border-gray-300 rounded-lg p-3 text-sm"
              rows={3}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Ticket File *
            </label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="border border-gray-300 p-2 rounded-lg w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Accepts: JPG, PNG, PDF, or any image format
            </p>
          </div>

          <Button
            onClick={handleUpload}
            disabled={!file || !reason.trim() || !selectedWeek || loading}
            className="w-full"
          >
            {loading ? "Processing..." : "Submit Missing Ticket"}
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
                <CardTitle className="text-lg">Ticket Details</CardTitle>
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
                          <span className="font-semibold">Detected Date:</span>{" "}
                          {result.ticket.ticket_date || "N/A"}
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
                          <span className="font-semibold">Calculated Pay:</span>{" "}
                          ${result.ticket.total_pay || "0.00"}
                        </div>
                        <div>
                          <span className="font-semibold">Status:</span>{" "}
                          <span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-800">
                            Missing - Pending Approval
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 mt-2 border-t">
                        <span className="font-semibold">Your Reason:</span>
                        <p className="text-gray-700 mt-1">{reason}</p>
                      </div>

                      <p className="text-xs text-gray-600 mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                        ⚠️ This ticket is pending manager approval. It will not appear in your payroll until approved. Manager has been notified.
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
          <h3 className="font-semibold text-blue-900 mb-2">📋 What Happens Next:</h3>
          <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
            <li>AI analyzes the ticket date from the image</li>
            <li>System reconciles with material plant CSV records</li>
            <li>Manager receives alert notification</li>
            <li>Manager reviews: ticket details, your reason, plant records</li>
            <li>Manager can: <strong>Approve</strong>, <strong>Deny</strong>, or <strong>Void</strong></li>
            <li>If approved: appears in your payroll for the correct pay week</li>
            <li>If voided: ticket exists but you receive $0 pay</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
