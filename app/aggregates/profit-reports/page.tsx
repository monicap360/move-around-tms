"use client";
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

type Partner = { id: string; name: string };
type ReportItem = {
  id: string;
  date: string;
  partner_name: string | null;
  material: string | null;
  unit_type: string | null;
  quantity: number;
  pay_rate: number;
  bill_rate: number;
  total_pay: number;
  total_bill: number;
  total_profit: number;
  margin_pct: number;
  voided: boolean;
  status: string | null;
};

type GroupRow = {
  key: string;
  count: number;
  bill: number;
  pay: number;
  profit: number;
  margin_pct: number;
};

export default function ProfitReportsPage() {
  const [token, setToken] = useState("");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [material, setMaterial] = useState("");
  const [includeVoided, setIncludeVoided] = useState(false);
  const [groupBy, setGroupBy] = useState<
    "none" | "partner" | "material" | "day"
  >("none");
  const [items, setItems] = useState<ReportItem[]>([]);
  const [groups, setGroups] = useState<GroupRow[] | null>(null);
  const [totals, setTotals] = useState({
    bill: 0,
    pay: 0,
    profit: 0,
    margin_pct: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Optional: remember admin token locally for convenience
    const t = window.localStorage.getItem("admin_token") || "";
    if (t) setToken(t);
  }, []);

  useEffect(() => {
    if (token) loadPartners();
  }, [token]);

  async function loadPartners() {
    try {
      const res = await fetch("/api/admin/partners", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.ok)
        throw new Error(json.error || "Failed to load partners");
      setPartners(json.partners || []);
    } catch (e: any) {
      console.warn("Partners load failed", e?.message);
    }
  }

  async function runReport() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (partnerId) params.set("partner_id", partnerId);
      if (material) params.set("material", material);
      if (includeVoided) params.set("include_voided", "true");
      if (groupBy) params.set("group_by", groupBy);
      const res = await fetch(
        `/api/admin/profit-reports?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await res.json();
      if (!res.ok || !json.ok)
        throw new Error(json.error || "Failed to run report");
      setItems(json.items || []);
      setTotals(
        json.summary?.totals || { bill: 0, pay: 0, profit: 0, margin_pct: 0 },
      );
      setGroups(json.summary?.groups || null);
      if (token) window.localStorage.setItem("admin_token", token);
    } catch (e: any) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    const head = groups
      ? ["group", "count", "bill", "pay", "profit", "margin_pct"]
      : [
          "date",
          "partner",
          "material",
          "unit",
          "qty",
          "pay_rate",
          "bill_rate",
          "total_pay",
          "total_bill",
          "total_profit",
          "margin_pct",
        ];
    const rows = groups
      ? groups.map((g) => [
          g.key,
          g.count,
          g.bill.toFixed(2),
          g.pay.toFixed(2),
          g.profit.toFixed(2),
          g.margin_pct.toFixed(2),
        ])
      : items.map((it) => [
          it.date,
          it.partner_name || "",
          it.material || "",
          it.unit_type || "",
          it.quantity,
          it.pay_rate.toFixed(2),
          it.bill_rate.toFixed(2),
          it.total_pay.toFixed(2),
          it.total_bill.toFixed(2),
          it.total_profit.toFixed(2),
          it.margin_pct.toFixed(2),
        ]);
    const csv = [head, ...rows]
      .map((r) =>
        r
          .map((v) => {
            const s = String(v ?? "");
            return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
          })
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `profit-report${groupBy !== "none" ? `-${groupBy}` : ""}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const cards = useMemo(
    () => [
      { label: "Revenue (Bill)", value: totals.bill, color: "text-blue-700" },
      { label: "Driver Pay", value: totals.pay, color: "text-rose-700" },
      { label: "Profit", value: totals.profit, color: "text-emerald-700" },
      {
        label: "Margin %",
        value: totals.margin_pct,
        color: "text-gray-700",
        isPct: true,
      },
    ],
    [totals],
  );

  return (
    <main className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Profit Reports</h1>
        <Link href="/aggregates">
          <Button variant="secondary">Back</Button>
        </Link>
      </header>

      <section className="bg-white p-4 rounded border shadow-sm space-y-3">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Admin Token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full md:w-96 px-3 py-2 border rounded"
              placeholder="Enter admin token"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={runReport}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
              disabled={!token || loading}
            >
              {loading ? "Running…" : "Run report"}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-2 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-2 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Partner</label>
            <select
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              className="w-full px-2 py-2 border rounded"
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
            <label className="block text-xs text-gray-600 mb-1">Material</label>
            <input
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              className="w-full px-2 py-2 border rounded"
              placeholder="e.g. 57 Stone"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Group By</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="w-full px-2 py-2 border rounded"
            >
              <option value="none">None (per ticket)</option>
              <option value="partner">Partner</option>
              <option value="material">Material</option>
              <option value="day">Day</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={includeVoided}
                onChange={(e) => setIncludeVoided(e.target.checked)}
              />{" "}
              Include voided
            </label>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
            {error}
          </div>
        )}
      </section>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-5">
              <div className="text-sm text-gray-600">{c.label}</div>
              <div className={`text-2xl font-semibold ${c.color}`}>
                {c.isPct ? `${c.value.toFixed(2)}%` : `$${c.value.toFixed(2)}`}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {groupBy !== "none" ? "Grouped Summary" : "Tickets"}
        </h2>
        <Button onClick={exportCsv} variant="secondary">
          Export CSV
        </Button>
      </div>

      {groupBy !== "none" ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left border">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="p-2">Group</th>
                <th className="p-2 text-right">Count</th>
                <th className="p-2 text-right">Bill</th>
                <th className="p-2 text-right">Pay</th>
                <th className="p-2 text-right">Profit</th>
                <th className="p-2 text-right">Margin %</th>
              </tr>
            </thead>
            <tbody>
              {(groups || []).map((g) => (
                <tr key={g.key} className="border-b">
                  <td className="p-2">{g.key}</td>
                  <td className="p-2 text-right">{g.count}</td>
                  <td className="p-2 text-right">${g.bill.toFixed(2)}</td>
                  <td className="p-2 text-right">${g.pay.toFixed(2)}</td>
                  <td className="p-2 text-right text-emerald-700 font-medium">
                    ${g.profit.toFixed(2)}
                  </td>
                  <td className="p-2 text-right">{g.margin_pct.toFixed(2)}%</td>
                </tr>
              ))}
              {(groups || []).length === 0 && (
                <tr>
                  <td className="p-3 text-gray-500" colSpan={6}>
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left border">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="p-2">Date</th>
                <th className="p-2">Partner</th>
                <th className="p-2">Material</th>
                <th className="p-2">Unit</th>
                <th className="p-2 text-right">Qty</th>
                <th className="p-2 text-right">Pay Rate</th>
                <th className="p-2 text-right">Bill Rate</th>
                <th className="p-2 text-right">Driver Pay</th>
                <th className="p-2 text-right">Revenue</th>
                <th className="p-2 text-right">Profit</th>
                <th className="p-2 text-right">Margin %</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b">
                  <td className="p-2 whitespace-nowrap">{it.date}</td>
                  <td className="p-2">{it.partner_name || "-"}</td>
                  <td className="p-2">{it.material || "-"}</td>
                  <td className="p-2">{it.unit_type || "-"}</td>
                  <td className="p-2 text-right">{it.quantity}</td>
                  <td className="p-2 text-right">${it.pay_rate.toFixed(2)}</td>
                  <td className="p-2 text-right">${it.bill_rate.toFixed(2)}</td>
                  <td className="p-2 text-right">${it.total_pay.toFixed(2)}</td>
                  <td className="p-2 text-right">
                    ${it.total_bill.toFixed(2)}
                  </td>
                  <td className="p-2 text-right text-emerald-700 font-medium">
                    ${it.total_profit.toFixed(2)}
                  </td>
                  <td className="p-2 text-right">
                    {it.margin_pct.toFixed(2)}%
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="p-3 text-gray-500" colSpan={11}>
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>How profit is calculated</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-700 space-y-1">
          <p>
            For each ticket: total_bill = quantity × bill_rate, total_pay =
            quantity × pay_rate.
          </p>
          <p>
            Profit = total_bill − total_pay. Margin % = Profit ÷ total_bill.
          </p>
          <p>
            Example: bill $150 and pay $100 results in profit $50 and margin
            33.33%.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
