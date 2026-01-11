"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "../../components/ui/button";

type Item = {
  id: string;
  item_type: string;
  entity?: string | null;
  identifier?: string | null;
  effective_date?: string | null;
  expiration_date?: string | null;
  status?: string | null;
  document_url?: string | null;
  notes?: string | null;
};

export default function CompliancePage() {
  const [token, setToken] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [days, setDays] = useState(60);
  const [form, setForm] = useState<Partial<Item>>({ item_type: "UCR" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("admin_token") || "";
    if (t) setToken(t);
  }, []);
  useEffect(() => {
    if (token) load();
  }, [token, days]);

  async function load() {
    setError(null);
    try {
      const res = await fetch(`/api/admin/compliance?upcoming_days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load");
      setItems(json.items || []);
    } catch (e: any) {
      setError(e.message || "Error");
    }
  }

  async function addItem() {
    setError(null);
    try {
      const res = await fetch("/api/admin/compliance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to add");
      setForm({ item_type: "UCR" });
      load();
    } catch (e: any) {
      setError(e.message || "Error");
    }
  }

  return (
    <main className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">
          Compliance & Alerts
        </h1>
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
              placeholder="Enter admin token"
              className="w-full md:w-96 px-3 py-2 border rounded"
            />
          </div>
          <div className="flex items-end gap-2">
            <label className="text-sm">
              Alert Window (days)
              <input
                type="number"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-28 border p-2 rounded ml-2"
              />
            </label>
            <Button onClick={load} disabled={!token}>
              Refresh
            </Button>
          </div>
        </div>
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
            {error}
          </div>
        )}
      </section>

      <section className="bg-white p-4 rounded border shadow-sm space-y-3">
        <h2 className="text-lg font-semibold">Add Item</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <label className="text-sm">
            Type
            <select
              className="w-full border p-2 rounded"
              value={form.item_type || ""}
              onChange={(e) => setForm({ ...form, item_type: e.target.value })}
            >
              <option>UCR</option>
              <option>Insurance Certificate</option>
              <option>DOT Inspection</option>
              <option>Driver License</option>
              <option>Medical Certificate</option>
            </select>
          </label>
          <label className="text-sm">
            Entity
            <input
              className="w-full border p-2 rounded"
              value={form.entity || ""}
              onChange={(e) => setForm({ ...form, entity: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Identifier
            <input
              className="w-full border p-2 rounded"
              value={form.identifier || ""}
              onChange={(e) => setForm({ ...form, identifier: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Effective
            <input
              type="date"
              className="w-full border p-2 rounded"
              value={form.effective_date || ""}
              onChange={(e) =>
                setForm({ ...form, effective_date: e.target.value })
              }
            />
          </label>
          <label className="text-sm">
            Expiration
            <input
              type="date"
              className="w-full border p-2 rounded"
              value={form.expiration_date || ""}
              onChange={(e) =>
                setForm({ ...form, expiration_date: e.target.value })
              }
            />
          </label>
          <label className="text-sm">
            Doc URL
            <input
              className="w-full border p-2 rounded"
              value={form.document_url || ""}
              onChange={(e) =>
                setForm({ ...form, document_url: e.target.value })
              }
            />
          </label>
        </div>
        <div className="flex gap-2">
          <Button onClick={addItem} disabled={!token}>
            Add
          </Button>
        </div>
      </section>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left border">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="p-2">Type</th>
              <th className="p-2">Entity</th>
              <th className="p-2">Identifier</th>
              <th className="p-2">Effective</th>
              <th className="p-2">Expiration</th>
              <th className="p-2">Status</th>
              <th className="p-2">Document</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const daysLeft = it.expiration_date
                ? Math.ceil(
                    (new Date(it.expiration_date).getTime() - Date.now()) /
                      (1000 * 60 * 60 * 24),
                  )
                : undefined;
              const badge =
                daysLeft != null
                  ? daysLeft <= 0
                    ? "Expired"
                    : daysLeft <= 30
                      ? "Expiring"
                      : "OK"
                  : "";
              const color =
                badge === "Expired"
                  ? "text-red-700"
                  : badge === "Expiring"
                    ? "text-orange-700"
                    : "text-emerald-700";
              return (
                <tr key={it.id} className="border-b">
                  <td className="p-2">{it.item_type}</td>
                  <td className="p-2">{it.entity || "-"}</td>
                  <td className="p-2">{it.identifier || "-"}</td>
                  <td className="p-2">{it.effective_date || "-"}</td>
                  <td className="p-2">
                    {it.expiration_date || "-"}{" "}
                    {badge && (
                      <span className={`ml-2 text-xs ${color}`}>
                        ({badge}
                        {daysLeft != null ? ` ${daysLeft}d` : ""})
                      </span>
                    )}
                  </td>
                  <td className="p-2">{it.status || "-"}</td>
                  <td className="p-2">
                    {it.document_url ? (
                      <a
                        className="text-blue-600 underline"
                        href={it.document_url}
                        target="_blank"
                      >
                        Open
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td className="p-3 text-gray-500" colSpan={7}>
                  No items in alert window
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
