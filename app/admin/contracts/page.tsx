"use client";
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";

type Employee = { id: string; full_name: string };
type Contract = {
  id: string;
  employee_id: string;
  employees?: { full_name: string } | null;
  contract_type: "W2" | "1099" | "LEASE" | string;
  contract_url?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  renewal?: boolean | null;
  signed_by?: string | null;
};

export default function ContractsAdminPage() {
  const [token, setToken] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [items, setItems] = useState<Contract[]>([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState<Partial<Contract>>({ contract_type: "W2" });

  useEffect(() => {
    if (token) {
      loadEmployees();
      load();
    }
  }, [token]);

  async function loadEmployees() {
    const res = await fetch("/api/admin/employees", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (res.ok && json.ok)
      setEmployees(
        (json.items || []).map((e: any) => ({
          id: e.id,
          full_name: e.full_name,
        })),
      );
  }
  async function load() {
    setErr("");
    const res = await fetch("/api/admin/contracts", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setErr(json.error || "Failed to load");
      return;
    }
    setItems(json.items || []);
  }

  async function create() {
    setErr("");
    setMsg("");
    const res = await fetch("/api/admin/contracts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setErr(json.error || "Create failed");
      return;
    }
    setMsg("Contract created");
    setForm({ contract_type: "W2" });
    load();
  }

  return (
    <div className="p-6 space-y-6">
      <Card className="shadow-lg border bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <CardTitle>Contracts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 mt-2">
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

          {/* Create */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Employee
              </label>
              <select
                className="w-full px-3 py-2 border rounded"
                value={(form.employee_id as any) || ""}
                onChange={(e) =>
                  setForm({ ...form, employee_id: e.target.value })
                }
              >
                <option value="">Select...</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Type
              </label>
              <select
                className="w-full px-3 py-2 border rounded"
                value={form.contract_type as any}
                onChange={(e) =>
                  setForm({ ...form, contract_type: e.target.value as any })
                }
              >
                <option>W2</option>
                <option>1099</option>
                <option>LEASE</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Start
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded"
                value={form.start_date || ""}
                onChange={(e) =>
                  setForm({ ...form, start_date: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                End
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded"
                value={form.end_date || ""}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Contract URL
              </label>
              <input
                className="w-full px-3 py-2 border rounded"
                value={form.contract_url || ""}
                onChange={(e) =>
                  setForm({ ...form, contract_url: e.target.value })
                }
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={create}
                className="px-4 py-2 bg-blue-600 text-white rounded w-full"
              >
                Create
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

          {/* List */}
          <div className="overflow-x-auto border rounded">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="p-2 text-left">Employee</th>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-left">Start</th>
                  <th className="p-2 text-left">End</th>
                  <th className="p-2 text-left">URL</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      {it.employees?.full_name || it.employee_id}
                    </td>
                    <td className="p-2">{it.contract_type}</td>
                    <td className="p-2">{it.start_date || ""}</td>
                    <td className="p-2">{it.end_date || ""}</td>
                    <td className="p-2">
                      {it.contract_url ? (
                        <a
                          className="text-blue-600 underline"
                          href={it.contract_url}
                          target="_blank"
                        >
                          Open
                        </a>
                      ) : (
                        ""
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
