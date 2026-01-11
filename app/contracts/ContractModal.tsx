import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import { createClient } from "@/lib/supabase/client";

export default function ContractModal({
  open,
  onClose,
  contract,
  onSign,
}: {
  open: boolean;
  onClose: () => void;
  contract: {
    id: string;
    title: string;
    body: string;
    signed?: boolean;
  } | null;
  onSign: (id: string) => void;
}) {
  const [audit, setAudit] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchAudit() {
      if (!contract?.id) return;
      setLoadingAudit(true);
      // Try both load and partner contract audit logs
      let { data: loadAudit } = await supabase
        .from("contract_audit")
        .select("*")
        .eq("load_id", contract.id)
        .order("timestamp", { ascending: false });
      let { data: partnerAudit } = await supabase
        .from("compliance_violations")
        .select("*")
        .eq("partner_id", contract.id)
        .order("timestamp", { ascending: false });
      setAudit([...(loadAudit || []), ...(partnerAudit || [])]);
      setLoadingAudit(false);
    }
    if (open && contract?.id) fetchAudit();
  }, [open, contract?.id]);

  function handleDownloadPDF() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(contract?.title || "Contract", 10, 20);
    doc.setFontSize(12);
    doc.text((contract?.body || "").replace(/\n/g, "\n"), 10, 35);
    if (contract?.signed) {
      doc.setTextColor(0, 128, 0);
      doc.text("Status: Signed", 10, 60);
    } else {
      doc.setTextColor(200, 0, 0);
      doc.text("Status: Not Signed", 10, 60);
    }
    doc.save(`${contract?.title || "contract"}.pdf`);
  }

  if (!open || !contract) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
          onClick={onClose}
        >
          ×
        </button>
        <h2 className="text-xl font-bold mb-4">{contract.title}</h2>
        <div
          className="mb-6 whitespace-pre-line text-gray-700"
          style={{ minHeight: 120 }}
        >
          {contract.body}
        </div>
        <div className="mb-4">
          <span
            className={
              contract.signed
                ? "text-green-600 font-semibold"
                : "text-red-600 font-semibold"
            }
          >
            Status: {contract.signed ? "Signed" : "Not Signed"}
          </span>
        </div>
        <div className="flex gap-2 mb-4">
          <button
            className="bg-gray-200 px-4 py-1 rounded"
            onClick={handleDownloadPDF}
          >
            Download PDF
          </button>
          {!contract.signed && (
            <button
              className="bg-blue-600 text-white px-6 py-2 rounded"
              onClick={() => onSign(contract.id)}
            >
              Sign Contract
            </button>
          )}
        </div>
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Audit Trail</h3>
          {loadingAudit ? (
            <div className="text-gray-400">Loading audit…</div>
          ) : audit.length === 0 ? (
            <div className="text-gray-400">No audit records found.</div>
          ) : (
            <ul className="text-xs max-h-32 overflow-y-auto">
              {audit.map((a, i) => (
                <li key={i} className="mb-1">
                  <span className="font-mono text-gray-500">
                    {a.timestamp || a.signed_at || a.created_at}:
                  </span>{" "}
                  {a.action || a.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
