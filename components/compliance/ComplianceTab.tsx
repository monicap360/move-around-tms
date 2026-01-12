import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Card, CardHeader, CardContent, CardTitle } from "../../components/ui/card";
import { CheckCircle, AlertTriangle, XCircle, PenLine, Download, BarChart2, Bell, Search, FileText, FileSpreadsheet, StickyNote } from "lucide-react";
import Tesseract from "tesseract.js";
import { useRef as useReactRef } from "react";
import { utils as XLSXUtils, writeFile as XLSXWriteFile } from "xlsx";
import JSZip from "jszip";

export default function ComplianceTab({ driverId, role }: { driverId: string, role: "admin" | "driver" }) {
  const [profile, setProfile] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRefs = {
    cdl: useRef<HTMLInputElement>(null),
    medical: useRef<HTMLInputElement>(null),
    twic: useRef<HTMLInputElement>(null),
  };

  useEffect(() => {
    async function fetchData() {
      setError(null);
      // Fetch profile
      const { data: driver, error: profileError } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', driverId)
        .single();
      if (profileError) setError(profileError.message);
      if (driver) setProfile(driver);
      // Fetch documents
      const { data: docs, error: docsError } = await supabase
        .from('driver_documents')
        .select('*')
        .eq('driver_id', driverId);
      if (docsError) setError(docsError.message);
      if (docs) setDocuments(docs);
    }
    fetchData();
  }, [driverId]);

  async function handleUpload(type: string) {
    setUploading(true);
    setError(null);
    const file = fileInputRefs[type as keyof typeof fileInputRefs].current?.files?.[0];
    if (!file) {
      setUploading(false);
      return;
    }
    const filePath = `drivers/${driverId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file);
    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(filePath);

    // OCR extraction for CDL/medical
    let extracted = {};
    if (["cdl", "medical"].includes(type)) {
      try {
        const image = await file.arrayBuffer();
        const { data: ocr } = await Tesseract.recognize(new Blob([image]), "eng");
        const text = ocr.text;
        // Simple regex extraction for demo
        if (type === "cdl") {
          const expMatch = text.match(/exp.*?(\d{2,4}[\/-]\d{2}[\/-]\d{2,4})/i);
          const numMatch = text.match(/(\d{6,})/);
          extracted = {
            license_expiration: expMatch ? expMatch[1] : null,
            license_number: numMatch ? numMatch[1] : null
          };
        } else if (type === "medical") {
          const expMatch = text.match(/exp.*?(\d{2,4}[\/-]\d{2}[\/-]\d{2,4})/i);
          extracted = {
            medical_expiry: expMatch ? expMatch[1] : null
          };
        }
      } catch (ocrErr) {
        // Ignore OCR errors for now
      }
    }

    await supabase.from("driver_documents").insert({
      driver_id: driverId,
      doc_type: type,
      image_url: urlData?.publicUrl,
      status: "pending"
    });

    // Persist extracted fields to driver profile
    if (Object.keys(extracted).length > 0) {
      await supabase.from("drivers").update(extracted).eq("id", driverId);
    }

    setUploading(false);
    // Refresh
    const { data: docs } = await supabase
      .from('driver_documents')
      .select('*')
      .eq('driver_id', driverId);
    if (docs) setDocuments(docs);
    // Optionally, refresh profile fields here as well
  }

  // Compliance status bar logic
  function getComplianceStatus() {
    if (!profile) return { color: "gray", label: "Unknown", icon: XCircle };
    const expiringSoon = [profile.cdl_expiry, profile.medical_expiry, profile.twic_expiry].some(date => date && new Date(date) < new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) && new Date(date) > new Date());
    const expired = [profile.cdl_expiry, profile.medical_expiry, profile.twic_expiry].some(date => date && new Date(date) < new Date());
    if (expired) return { color: "red", label: "Expired / Missing", icon: XCircle };
    if (expiringSoon) return { color: "yellow", label: "Expiring Soon", icon: AlertTriangle };
    return { color: "green", label: "Compliant", icon: CheckCircle };
  }
  const compliance = getComplianceStatus();

  // Compliance checklist logic
  const checklist = [
    {
      label: "CDL License",
      docType: "cdl",
      expiry: profile?.cdl_expiry,
      uploaded: documents.some(d => d.doc_type === "cdl"),
      status: documents.find(d => d.doc_type === "cdl")?.status,
    },
    {
      label: "Medical Card",
      docType: "medical",
      expiry: profile?.medical_expiry,
      uploaded: documents.some(d => d.doc_type === "medical"),
      status: documents.find(d => d.doc_type === "medical")?.status,
    },
    {
      label: "TWIC Card",
      docType: "twic",
      expiry: profile?.twic_expiry,
      uploaded: documents.some(d => d.doc_type === "twic"),
      status: documents.find(d => d.doc_type === "twic")?.status,
    },
  ];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card className="rounded-2xl shadow-lg mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Search className="w-5 h-5 text-blue-500" /> Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <input
            className="w-full border rounded px-3 py-2 mb-2 text-black"
            placeholder="Search by document name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </CardContent>
      </Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <BarChart2 className="w-5 h-5 text-blue-500" /> Compliance Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6">
            <div className="flex flex-col items-center"><span className="text-green-600 font-bold text-lg">{compliantCount}</span><span className="text-xs">Compliant</span></div>
            <div className="flex flex-col items-center"><span className="text-yellow-600 font-bold text-lg">{expiringSoonCount}</span><span className="text-xs">Expiring Soon</span></div>
            <div className="flex flex-col items-center"><span className="text-red-600 font-bold text-lg">{expiredCount}</span><span className="text-xs">Expired</span></div>
          </div>
        </CardContent>
      </Card>
      {reminders.length > 0 && (
        <Card className="rounded-2xl shadow-lg mb-6 border-yellow-400">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-yellow-700"><Bell className="w-5 h-5" /> Upcoming Expirations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc ml-6">
              {reminders.map(r => (
                <li key={r.label} className="text-yellow-700">{r.label}: <span className="font-semibold">{r.expiry}</span></li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            Audit & Signatures
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <button
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 disabled:opacity-50"
              onClick={handleDownloadAll}
              disabled={downloadLoading || documents.length === 0}
            >
              <Download className="w-5 h-5" />
              {downloadLoading ? "Preparing..." : "Download All Documents"}
            </button>
            <button
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 disabled:opacity-50"
              onClick={() => handleSign("Drug & Alcohol Policy")}
              disabled={signing}
            >
              <PenLine className="w-5 h-5" />
              {signature ? "Signed" : "Sign Drug & Alcohol Policy"}
            </button>
            {signature && <span className="text-xs text-green-600 ml-2">{signature}</span>}
          </div>
        </CardContent>
      </Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            Compliance Status
            <compliance.icon className={`w-5 h-5 text-${compliance.color}-500`} />
            <span className={`text-${compliance.color}-600 font-semibold`}>{compliance.label}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-2">CDL Expiry: {profile?.cdl_expiry || "-"}</div>
          <div className="mb-2">Medical Card Expiry: {profile?.medical_expiry || "-"}</div>
          <div className="mb-2">TWIC Expiry: {profile?.twic_expiry || "-"}</div>
        </CardContent>
      </Card>
      <Card className="rounded-2xl shadow-lg mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            Compliance Checklist
            <button className="ml-2 flex items-center gap-1 text-blue-600 underline" onClick={exportToExcel}><FileSpreadsheet className="w-4 h-4" />Export Excel</button>
            <button className="ml-2 flex items-center gap-1 text-blue-600 underline" onClick={exportToPDF}><FileText className="w-4 h-4" />Export PDF</button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {filteredChecklist.map(item => {
              let statusIcon = <XCircle className="w-5 h-5 text-red-500 inline-block mr-1" />;
              let statusText = "Missing";
              if (item.uploaded && item.status === "approved") {
                statusIcon = <CheckCircle className="w-5 h-5 text-green-500 inline-block mr-1" />;
                statusText = "Approved";
              } else if (item.uploaded && item.status === "pending") {
                statusIcon = <AlertTriangle className="w-5 h-5 text-yellow-500 inline-block mr-1" />;
                statusText = "Pending Approval";
              }
              let expiryWarning = "";
              if (item.expiry) {
                const expDate = new Date(item.expiry);
                if (expDate < new Date()) expiryWarning = " (Expired)";
                else if (expDate < new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)) expiryWarning = " (Expiring Soon)";
              }
              return (
                <li key={item.docType} className="flex items-center gap-2">
                  {statusIcon}
                  <span className="font-semibold">{item.label}</span>
                  <span className="text-xs text-gray-500">{statusText}{expiryWarning}</span>
                  {role === 'driver' && <>
                    <input type="file" ref={fileInputRefs[item.docType as keyof typeof fileInputRefs]} className="hidden" accept="image/*,application/pdf" onChange={() => handleUpload(item.docType)} disabled={uploading} />
                    <button className="btn btn-primary ml-2" onClick={() => fileInputRefs[item.docType as keyof typeof fileInputRefs].current?.click()} disabled={uploading}>Upload</button>
                  </>}
                  {role === 'admin' && item.uploaded && item.status === "pending" && <button className="ml-2 text-green-600 underline" onClick={async () => { await supabase.from('driver_documents').update({ status: 'approved' }).eq('id', documents.find(d => d.doc_type === item.docType)?.id); const { data: docs } = await supabase.from('driver_documents').select('*').eq('driver_id', driverId); if (docs) setDocuments(docs); }}>Approve</button>}
                  {item.uploaded && <a href={documents.find(d => d.doc_type === item.docType)?.image_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline ml-2">View</a>}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
            <Card className="rounded-2xl shadow-lg mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-3"><StickyNote className="w-5 h-5 text-blue-500" /> HR Notes / Disciplinary Log</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="mb-2 list-disc ml-6">
                  {hrNotes.length === 0 && <li className="text-gray-400">No notes yet.</li>}
                  {hrNotes.map((note, idx) => <li key={idx}>{note}</li>)}
                </ul>
                <div className="flex gap-2">
                  <input ref={hrNoteRef} className="border rounded px-2 py-1 text-black" placeholder="Add HR note..." />
                  <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={addHrNote}>Add</button>
                </div>
              </CardContent>
            </Card>
      {error && <div className="text-red-600 mb-4">{error}</div>}
    </div>
  );
}
