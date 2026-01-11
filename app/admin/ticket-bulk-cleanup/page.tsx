"use client";
import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";

type Partner = { id: string; name: string };
type TicketItem = {
  id: string;
  ticket_number: string | null;
  ticket_date: string;
  material: string | null;
  quantity: number | null;
  unit_type: string | null;
  status: string | null;
  voided: boolean | null;
  aggregate_partners?: { id: string; name: string } | null;
  drivers?: { id: string; name: string } | null;
};

export default function TicketBulkCleanupPage() {
  const [adminToken, setAdminToken] = useState("");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerId, setPartnerId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [voided, setVoided] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<TicketItem[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!adminToken) return;
    loadPartners();
  }, [adminToken]);

  async function loadPartners() {
    setErr("");
    try {
      const res = await fetch("/api/admin/partners", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const json = await res.json();
      if (!res.ok || !json.ok)
        throw new Error(json.error || "Failed to load partners");
      setPartners(json.partners || []);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function search() {
    setLoading(true);
    setErr("");
    setMsg("");
    setItems([]);
    setSelected({});
    try {
      const url = new URL(window.location.origin + "/api/admin/tickets/search");
      if (from) url.searchParams.set("from", from);
      if (to) url.searchParams.set("to", to);
      if (partnerId) url.searchParams.set("partnerId", partnerId);
      if (status) url.searchParams.set("status", status);
      if (voided) url.searchParams.set("voided", voided);
      if (q) url.searchParams.set("q", q);
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Search failed");
      setItems(json.items || []);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleAll(checked: boolean) {
    const map: Record<string, boolean> = {};
    items.forEach((it) => (map[it.id] = checked));
    setSelected(map);
  }

  function selectedIds(): string[] {
    return Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k);
  }

  async function bulk(action: "void" | "delete") {
    const ids = selectedIds();
    if (ids.length === 0) {
      setErr("No tickets selected");
      return;
    }
    if (
      !confirm(
        action === "void"
          ? `Mark ${ids.length} tickets as VOID (excluded from payroll)?`
          : `Permanently DELETE ${ids.length} tickets? This cannot be undone.`,
      )
    )
      return;

    setLoading(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch("/api/admin/tickets/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ action, ticketIds: ids }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok)
        throw new Error(json.error || "Bulk operation failed");
      setMsg(
        action === "void"
          ? `Voided ${json.updated || 0} tickets`
          : `Deleted ${json.deleted || 0} tickets`,
      );
      // Refresh results
      await search();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <Card className="shadow-lg border bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <CardTitle>Ticket Bulk Cleanup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 mt-2">
          {/* Admin Token */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Admin Token
            </label>
            <input
              type="password"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              className="w-full md:w-96 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter admin token"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                From
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                To
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Partner
              </label>
              <select
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">All</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">Any</option>
                <option value="Pending Manager Review">
                  Pending Manager Review
                </option>
                <option value="Approved">Approved</option>
                <option value="Denied">Denied</option>
                <option value="Voided">Voided</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Voided
              </label>
              <select
                value={voided}
                onChange={(e) => setVoided(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">Either</option>
                <option value="false">Not Voided</option>
                <option value="true">Voided</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                placeholder="Ticket number or material"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={search}
                className="px-4 py-2 bg-blue-600 text-white rounded w-full md:w-auto"
              >
                Search
              </button>
            </div>
          </div>

          {err && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
              {err}
            </div>
          )}
          {msg && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded">
              {msg}
            </div>
          )}

          {/* Results */}
          <div className="flex items-center justify-between py-2">
            <div className="text-sm text-gray-600">Results: {items.length}</div>
            {items.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                  Select all
                </label>
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="overflow-x-auto border rounded">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="p-2"></th>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Ticket #</th>
                    <th className="p-2 text-left">Partner</th>
                    <th className="p-2 text-left">Material</th>
                    <th className="p-2 text-left">Qty</th>
                    <th className="p-2 text-left">Unit</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Voided</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={!!selected[it.id]}
                          onChange={(e) =>
                            setSelected({
                              ...selected,
                              [it.id]: e.target.checked,
                            })
                          }
                        />
                      </td>
                      <td className="p-2">
                        {new Date(it.ticket_date).toLocaleDateString()}
                      </td>
                      <td className="p-2">{it.ticket_number || ""}</td>
                      <td className="p-2">
                        {it.aggregate_partners?.name || ""}
                      </td>
                      <td className="p-2">{it.material || ""}</td>
                      <td className="p-2">{it.quantity ?? ""}</td>
                      <td className="p-2">{it.unit_type || ""}</td>
                      <td className="p-2">{it.status || ""}</td>
                      <td className="p-2">{it.voided ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {items.length > 0 && (
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-end">
              <button
                onClick={() => bulk("void")}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded"
                disabled={loading}
              >
                Void Selected
              </button>
              <button
                onClick={() => bulk("delete")}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded"
                disabled={loading}
              >
                Delete Selected
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
