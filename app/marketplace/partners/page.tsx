import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";

const supabase = createClient();
const ContractModal = dynamic(() => import("../../contracts/ContractModal"), {
  ssr: false,
});

export default function MarketplacePartners() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [contractModal, setContractModal] = useState<{
    open: boolean;
    contract: any;
  } | null>(null);
  const [contractStatuses, setContractStatuses] = useState<{
    [key: string]: boolean;
  } | null>(null);

  useEffect(() => {
    async function fetchPartners() {
      setLoading(true);
      setError("");
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) setError(error.message);
      setPartners(data || []);
      // Fetch contract statuses for all partners
      if (data && data.length > 0) {
        const ids = data.map((p: any) => p.id);
        const { data: contracts } = await supabase
          .from("partner_contracts")
          .select("partner_id,signed")
          .in("partner_id", ids);
        const statusMap: { [key: string]: boolean } = {};
        (contracts || []).forEach((c: any) => {
          statusMap[c.partner_id] = !!c.signed;
        });
        setContractStatuses(statusMap);
      } else {
        setContractStatuses({});
      }
      setLoading(false);
    }
    fetchPartners();
    const interval = setInterval(fetchPartners, 20000);
    return () => clearInterval(interval);
  }, []);

  async function handleMessage(partnerId: string, complianceStatus: string) {
    if (complianceStatus !== "Compliant") {
      alert("Cannot message: Partner is not compliant.");
      await supabase
        .from("compliance_violations")
        .insert([
          {
            action: "message_partner",
            reason: "Partner not compliant",
            partner_id: partnerId,
            timestamp: new Date().toISOString(),
          },
        ]);
      return;
    }
    alert("Messaging feature coming soon!");
  }

  async function handleView(partnerId: string, complianceStatus: string) {
    if (complianceStatus !== "Compliant") {
      alert("Cannot view: Partner is not compliant.");
      await supabase
        .from("compliance_violations")
        .insert([
          {
            action: "view_partner",
            reason: "Partner not compliant",
            partner_id: partnerId,
            timestamp: new Date().toISOString(),
          },
        ]);
      return;
    }
    alert("View partner details coming soon!");
  }

  async function handleSignContract(partnerId: string) {
    // Mark contract as signed in Supabase and log
    await supabase
      .from("partner_contracts")
      .upsert([
        {
          partner_id: partnerId,
          signed: true,
          signed_at: new Date().toISOString(),
        },
      ]);
    await supabase
      .from("compliance_violations")
      .insert([
        {
          action: "sign_contract",
          reason: "Partner contract signed",
          partner_id: partnerId,
          timestamp: new Date().toISOString(),
        },
      ]);
    setContractModal(null);
    // Optionally refresh partners/contracts
  }

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Partner Network</h1>
      {loading ? (
        <div className="py-10 text-center text-gray-400">Loading partners…</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <table className="min-w-full border text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Partner</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Compliance</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {partners.map((partner: any) => (
              <tr key={partner.id}>
                <td className="border p-2">{partner.name}</td>
                <td className="border p-2">{partner.status}</td>
                <td className="border p-2">
                  {partner.compliance_status || "Unknown"}
                </td>
                <td className="border p-2 flex gap-2 items-center">
                  <button
                    className="bg-blue-600 text-white px-3 py-1 rounded"
                    onClick={() =>
                      handleView(
                        partner.id,
                        partner.compliance_status || "Unknown",
                      )
                    }
                  >
                    View
                  </button>
                  <button
                    className="bg-green-600 text-white px-3 py-1 rounded"
                    onClick={() =>
                      handleMessage(
                        partner.id,
                        partner.compliance_status || "Unknown",
                      )
                    }
                  >
                    Message
                  </button>
                  <button
                    className="bg-yellow-600 text-white px-3 py-1 rounded"
                    onClick={() =>
                      setContractModal({
                        open: true,
                        contract: {
                          id: partner.id,
                          title: `Partner Agreement: ${partner.name}`,
                          body: `This is a digital contract between your company and ${partner.name}.\nBy signing, you agree to all terms and compliance requirements.`,
                          signed: contractStatuses?.[partner.id],
                        },
                      })
                    }
                  >
                    Contract
                  </button>
                  <span
                    className={
                      contractStatuses?.[partner.id]
                        ? "text-green-600 text-xs font-semibold"
                        : "text-red-600 text-xs font-semibold"
                    }
                  >
                    {contractStatuses?.[partner.id] ? "Signed" : "Not Signed"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <ContractModal
        open={!!contractModal?.open}
        onClose={() => setContractModal(null)}
        contract={contractModal?.contract || null}
        onSign={handleSignContract}
      />
    </main>
  );
}
