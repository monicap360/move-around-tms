"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...(init || {}),
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data as T;
}

export default function InvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [form, setForm] = useState<any>({
    company: "",
    contact_name: "",
    contact_email: "",
    billing_address: "",
    movement_type: "Intrastate",
    primary_state: "TX",
    line_items: [
      { description: "Aggregate hauling", quantity: 1, unit_price: 0 } as any,
    ],
  });
  const [downloading, setDownloading] = useState(false);

  const subtotal = useMemo(() => {
    return (form.line_items || []).reduce(
      (s: number, it: any) =>
        s +
        ((it.amount ?? Number(it.quantity || 0) * Number(it.unit_price || 0)) ||
          0),
      0,
    );
  }, [form.line_items]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await api<{ invoices: any[] }>("/api/invoices");
        setInvoices(data.invoices);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const addLine = () =>
    setForm((f: any) => ({
      ...f,
      line_items: [
        ...(f.line_items || []),
        { description: "", quantity: 1, unit_price: 0 },
      ],
    }));
  const removeLine = (idx: number) =>
    setForm((f: any) => ({
      ...f,
      line_items: f.line_items.filter((_: any, i: number) => i !== idx),
    }));

  const createInvoice = async () => {
    try {
      const payload = {
        company: form.company,
        contact_name: form.contact_name,
        contact_email: form.contact_email,
        billing_address: form.billing_address,
        movement_type: form.movement_type,
        primary_state: form.primary_state,
        line_items: form.line_items,
      };
      const data = await api<{ invoice: any }>("/api/invoices", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setInvoices((arr) => [data.invoice, ...arr]);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const downloadPdf = async (inv: any) => {
    setDownloading(true);
    try {
      const res = await fetch("/api/invoices/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: inv.company,
          contact_name: inv.contact_name,
          contact_email: inv.contact_email,
          billing_address: inv.billing_address,
          line_items: inv.line_items,
          notes: inv.notes,
          invoice_number: inv.invoice_number,
          invoice_date: new Date(inv.created_at).toLocaleDateString("en-US"),
          due_date: inv.due_date
            ? new Date(inv.due_date).toLocaleDateString("en-US")
            : undefined,
        }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${inv.invoice_number || "Invoice"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-gray-600">
            Create and download branded invoices for aggregates
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Invoice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              className="border p-2 rounded"
              placeholder="Company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
            <input
              className="border p-2 rounded"
              placeholder="Contact Name"
              value={form.contact_name}
              onChange={(e) =>
                setForm({ ...form, contact_name: e.target.value })
              }
            />
            <input
              className="border p-2 rounded"
              placeholder="Contact Email"
              value={form.contact_email}
              onChange={(e) =>
                setForm({ ...form, contact_email: e.target.value })
              }
            />
            <input
              className="border p-2 rounded"
              placeholder="Billing Address"
              value={form.billing_address}
              onChange={(e) =>
                setForm({ ...form, billing_address: e.target.value })
              }
            />
            <select
              className="border p-2 rounded"
              value={form.movement_type}
              onChange={(e) =>
                setForm({ ...form, movement_type: e.target.value })
              }
            >
              <option value="Intrastate">Intrastate</option>
              <option value="Interstate">Interstate</option>
            </select>
            <input
              className="border p-2 rounded"
              placeholder="Primary State (e.g., TX)"
              value={form.primary_state}
              onChange={(e) =>
                setForm({
                  ...form,
                  primary_state: e.target.value.toUpperCase().slice(0, 2),
                })
              }
            />
          </div>

          <div className="space-y-2">
            <div className="font-medium">Line Items</div>
            {(form.line_items || []).map((li: any, idx: number) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <input
                  className="col-span-6 border p-2 rounded"
                  placeholder="Description"
                  value={li.description}
                  onChange={(e) =>
                    setForm((f: any) => {
                      const arr = [...f.line_items];
                      arr[idx] = { ...arr[idx], description: e.target.value };
                      return { ...f, line_items: arr };
                    })
                  }
                />
                <input
                  className="col-span-2 border p-2 rounded"
                  type="number"
                  placeholder="Qty"
                  value={li.quantity}
                  onChange={(e) =>
                    setForm((f: any) => {
                      const arr = [...f.line_items];
                      arr[idx] = {
                        ...arr[idx],
                        quantity: Number(e.target.value),
                      };
                      return { ...f, line_items: arr };
                    })
                  }
                />
                <input
                  className="col-span-2 border p-2 rounded"
                  type="number"
                  placeholder="Rate"
                  value={li.unit_price}
                  onChange={(e) =>
                    setForm((f: any) => {
                      const arr = [...f.line_items];
                      arr[idx] = {
                        ...arr[idx],
                        unit_price: Number(e.target.value),
                      };
                      return { ...f, line_items: arr };
                    })
                  }
                />
                <div className="col-span-1 text-right">
                  $
                  {(
                    (li.amount ??
                      Number(li.quantity || 0) * Number(li.unit_price || 0)) ||
                    0
                  ).toFixed(2)}
                </div>
                <button
                  className="col-span-1 text-red-600"
                  onClick={() => removeLine(idx)}
                >
                  Remove
                </button>
              </div>
            ))}
            <Button onClick={addLine} variant="secondary">
              Add Line
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-gray-700">
              Subtotal: ${subtotal.toFixed(2)}
            </div>
            <Button onClick={createInvoice}>Save Invoice</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div>Loading…</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Number</th>
                  <th className="py-2 pr-4">Company</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">AR Status</th>
                  <th className="py-2 pr-4">Movement</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b">
                    <td className="py-2 pr-4">{inv.invoice_number}</td>
                    <td className="py-2 pr-4">{inv.company}</td>
                    <td className="py-2 pr-4">
                      ${Number(inv.total || 0).toFixed(2)}
                    </td>
                    <td className="py-2 pr-4">{inv.ar_status || "Open"}</td>
                    <td className="py-2 pr-4">
                      {inv.movement_type || "-"}
                      {inv.primary_state ? ` (${inv.primary_state})` : ""}
                    </td>
                    <td className="py-2 pr-4">
                      <Button
                        size="sm"
                        disabled={downloading}
                        onClick={() => downloadPdf(inv)}
                      >
                        PDF
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
