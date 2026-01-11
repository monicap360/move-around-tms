"use client";
import { useEffect, useMemo, useState } from "react";

type Employee = {
  id: string;
  full_name: string;
  role_type?: string | null;
  worker_type?: string | null;
  pay_type?: "hourly" | "percentage" | "salary" | string | null;
  hourly_rate?: number | null;
  percentage_rate?: number | null;
  salary_amount?: number | null;
};

type PayrollEntry = {
  id: string;
  employee_id: string;
  pay_period_start: string;
  pay_period_end: string;
  total_hours?: number | null;
  load_revenue?: number | null;
  deductions?: number | null;
  net_pay?: number | null;
  employees?: { full_name: string } | null;
};

export default function HRPayrollDashboard() {
  const [token, setToken] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<PayrollEntry[]>([]);
  const [historyEmployeeId, setHistoryEmployeeId] = useState<string | null>(
    null,
  );
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<
    Partial<
      PayrollEntry & {
        gross_pay?: number | null;
        hourly_rate?: number | null;
        percentage_rate?: number | null;
      }
    >
  >({});

  const rateFor = (e: Employee) =>
    e.hourly_rate ?? e.percentage_rate ?? e.salary_amount ?? null;

  async function loadEmployees() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/employees", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.ok)
        throw new Error(json.error || "Failed to load employees");
      setEmployees(json.items || []);
    } catch (e: any) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) loadEmployees();
  }, [token]);

  async function viewHistory(
    id: string,
    opts?: { from?: string; to?: string },
  ) {
    setHistoryOpen(true);
    setHistory([]);
    setError(null);
    setHistoryEmployeeId(id);
    try {
      const params = new URLSearchParams({ employee_id: id });
      if (opts?.from) params.set("from", opts.from);
      if (opts?.to) params.set("to", opts.to);
      const res = await fetch(
        `/api/admin/payroll-entries?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await res.json();
      if (!res.ok || !json.ok)
        throw new Error(json.error || "Failed to load history");
      setHistory(json.items || []);
    } catch (e: any) {
      setError(e.message || "Error");
    }
  }

  async function submitPayroll(form: FormData) {
    setError(null);
    setSuccess(null);
    const payload = {
      employee_id: String(form.get("employee_id") || ""),
      pay_period_start: String(form.get("start") || ""),
      pay_period_end: String(form.get("end") || ""),
      total_hours: parseFloat(String(form.get("hours") || "0")) || 0,
      load_revenue: parseFloat(String(form.get("revenue") || "0")) || 0,
      deductions: parseFloat(String(form.get("deductions") || "0")) || 0,
    };
    try {
      const res = await fetch("/api/admin/payroll-entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok)
        throw new Error(json.error || "Failed to create payroll");
      const net = json.item?.net_pay ?? 0;
      setSuccess(`Payroll created. Net $${Number(net).toFixed(2)}`);
      // Refresh history if the same employee is open
      if (historyOpen && payload.employee_id)
        viewHistory(payload.employee_id, {
          from: fromDate || undefined,
          to: toDate || undefined,
        });
    } catch (e: any) {
      setError(e.message || "Error");
    }
  }

  function exportHistoryCsv() {
    const rows = [
      [
        "employee",
        "pay_period_start",
        "pay_period_end",
        "total_hours",
        "hourly_rate",
        "percentage_rate",
        "load_revenue",
        "deductions",
        "gross_pay",
        "net_pay",
      ],
      ...history.map((h) => [
        h.employees?.full_name || "",
        h.pay_period_start,
        h.pay_period_end,
        h.total_hours ?? "",
        (h as any).hourly_rate ?? "",
        (h as any).percentage_rate ?? "",
        h.load_revenue ?? "",
        h.deductions ?? "",
        (h as any).gross_pay ?? "",
        h.net_pay ?? "",
      ]),
    ];
    const csv = rows
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
    a.download = `payroll-history-${historyEmployeeId || "all"}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const formDefaults = useMemo(() => {
    if (!selected) return { label: "", placeholder: "Rate / % / Salary" };
    const rate = rateFor(selected);
    return {
      label:
        selected.pay_type === "hourly"
          ? "Hourly Rate"
          : selected.pay_type === "percentage"
            ? "Driver %"
            : selected.pay_type === "salary"
              ? "Salary"
              : "Rate",
      placeholder: rate != null ? String(rate) : "Rate",
    };
  }, [selected]);

  return (
    <main className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">
          HR & Payroll Dashboard
        </h1>
      </header>

      <section className="bg-white p-4 rounded border shadow-sm space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
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
              onClick={loadEmployees}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
              disabled={!token || loading}
            >
              Reload
            </button>
          </div>
        </div>
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded">
            {success}
          </div>
        )}
      </section>

      <section className="bg-white p-4 rounded border shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Employees</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left border">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="p-2">Name</th>
                <th className="p-2">Role</th>
                <th className="p-2">Type</th>
                <th className="p-2">Pay Type</th>
                <th className="p-2">Rate / % / Salary</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="border-b">
                  <td className="p-2">{e.full_name}</td>
                  <td className="p-2">{e.role_type || "-"}</td>
                  <td className="p-2">{e.worker_type || "-"}</td>
                  <td className="p-2">{e.pay_type || "-"}</td>
                  <td className="p-2">{rateFor(e) ?? "-"}</td>
                  <td className="p-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelected(e);
                        }}
                        className="text-gray-700 underline"
                      >
                        Select
                      </button>
                      <button
                        onClick={() => viewHistory(e.id)}
                        className="text-blue-600 underline"
                      >
                        History
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white p-4 rounded border shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Run Payroll</h2>
        <form
          id="payroll-form"
          className="grid grid-cols-2 md:grid-cols-3 gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            submitPayroll(fd);
          }}
        >
          <input
            type="text"
            name="employee_id"
            placeholder="Employee ID"
            className="border p-2 rounded"
            required
            defaultValue={selected?.id || ""}
          />
          <input
            type="date"
            name="start"
            className="border p-2 rounded"
            required
          />
          <input
            type="date"
            name="end"
            className="border p-2 rounded"
            required
          />
          <input
            type="number"
            step="0.01"
            name="hours"
            placeholder="Hours"
            className="border p-2 rounded"
          />
          <input
            type="number"
            step="0.01"
            name="revenue"
            placeholder="Load Revenue"
            className="border p-2 rounded"
          />
          <input
            type="number"
            step="0.01"
            name="deductions"
            placeholder="Deductions"
            className="border p-2 rounded"
          />
          <div className="md:col-span-3 text-sm text-gray-500">
            {selected
              ? `${selected.full_name} — ${formDefaults.label}: ${formDefaults.placeholder}`
              : "Select an employee to prefill context"}
          </div>
          <div className="md:col-span-3">
            <button
              id="runPayroll"
              className="mt-2 bg-blue-600 text-white px-4 py-2 rounded"
              disabled={!token}
            >
              Submit Payroll
            </button>
          </div>
        </form>
      </section>

      {/* History Modal */}
      {historyOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-lg w-96 max-h-[80vh] overflow-auto shadow-xl">
            <div className="flex flex-col gap-2 border-b p-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Payroll History</h3>
                <button
                  onClick={() => setHistoryOpen(false)}
                  className="text-red-600 font-bold"
                >
                  ×
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="border p-2 rounded"
                />
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="border p-2 rounded"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (historyEmployeeId)
                      viewHistory(historyEmployeeId, {
                        from: fromDate || undefined,
                        to: toDate || undefined,
                      });
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded"
                >
                  Apply
                </button>
                <button
                  onClick={exportHistoryCsv}
                  className="px-3 py-1.5 bg-gray-700 text-white rounded"
                >
                  Export CSV
                </button>
              </div>
            </div>
            <ul className="divide-y">
              {history.map((p) => {
                const isEditing = editingId === p.id;
                return (
                  <li key={p.id} className="p-2 border-b">
                    {!isEditing ? (
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm">
                          <div>
                            {p.pay_period_start} → {p.pay_period_end}
                          </div>
                          <div className="text-gray-500">
                            Hours: {p.total_hours ?? "-"} | Revenue:{" "}
                            {p.load_revenue ?? "-"} | Deductions:{" "}
                            {p.deductions ?? "-"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="font-medium">
                            ${Number(p.net_pay ?? 0).toFixed(2)}
                          </div>
                          <button
                            className="text-blue-600 underline"
                            onClick={() => {
                              setEditingId(p.id);
                              setEdit({ ...p });
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <label className="text-xs">
                            Start
                            <input
                              type="date"
                              className="border p-1 rounded w-full"
                              value={String(edit.pay_period_start || "")}
                              onChange={(e) =>
                                setEdit({
                                  ...edit,
                                  pay_period_start: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label className="text-xs">
                            End
                            <input
                              type="date"
                              className="border p-1 rounded w-full"
                              value={String(edit.pay_period_end || "")}
                              onChange={(e) =>
                                setEdit({
                                  ...edit,
                                  pay_period_end: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label className="text-xs">
                            Hours
                            <input
                              type="number"
                              step="0.01"
                              className="border p-1 rounded w-full"
                              value={String(edit.total_hours ?? "")}
                              onChange={(e) =>
                                setEdit({
                                  ...edit,
                                  total_hours:
                                    e.target.value === ""
                                      ? null
                                      : Number(e.target.value),
                                })
                              }
                            />
                          </label>
                          <label className="text-xs">
                            Revenue
                            <input
                              type="number"
                              step="0.01"
                              className="border p-1 rounded w-full"
                              value={String(edit.load_revenue ?? "")}
                              onChange={(e) =>
                                setEdit({
                                  ...edit,
                                  load_revenue:
                                    e.target.value === ""
                                      ? null
                                      : Number(e.target.value),
                                })
                              }
                            />
                          </label>
                          <label className="text-xs">
                            Deductions
                            <input
                              type="number"
                              step="0.01"
                              className="border p-1 rounded w-full"
                              value={String(edit.deductions ?? "")}
                              onChange={(e) =>
                                setEdit({
                                  ...edit,
                                  deductions:
                                    e.target.value === ""
                                      ? null
                                      : Number(e.target.value),
                                })
                              }
                            />
                          </label>
                        </div>
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            className="px-3 py-1.5 bg-gray-200 rounded"
                            onClick={() => {
                              setEditingId(null);
                              setEdit({});
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            className="px-3 py-1.5 bg-blue-600 text-white rounded"
                            onClick={async () => {
                              try {
                                const payload: any = { id: p.id };
                                if (edit.pay_period_start)
                                  payload.pay_period_start =
                                    edit.pay_period_start;
                                if (edit.pay_period_end)
                                  payload.pay_period_end = edit.pay_period_end;
                                if (typeof edit.total_hours !== "undefined")
                                  payload.total_hours = edit.total_hours;
                                if (typeof edit.load_revenue !== "undefined")
                                  payload.load_revenue = edit.load_revenue;
                                if (typeof edit.deductions !== "undefined")
                                  payload.deductions = edit.deductions;
                                const res = await fetch(
                                  "/api/admin/payroll-entries",
                                  {
                                    method: "PATCH",
                                    headers: {
                                      "Content-Type": "application/json",
                                      Authorization: `Bearer ${token}`,
                                    },
                                    body: JSON.stringify(payload),
                                  },
                                );
                                const json = await res.json();
                                if (!res.ok || !json.ok)
                                  throw new Error(
                                    json.error || "Update failed",
                                  );
                                // refresh list
                                if (historyEmployeeId)
                                  await viewHistory(historyEmployeeId, {
                                    from: fromDate || undefined,
                                    to: toDate || undefined,
                                  });
                                setEditingId(null);
                                setEdit({});
                              } catch (e: any) {
                                setError(e.message || "Error");
                              }
                            }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
              {history.length === 0 && (
                <li className="p-3 text-gray-500">No records</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </main>
  );
}
