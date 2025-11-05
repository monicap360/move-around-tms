"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...(init || {}),
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

export default function QuoteRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [draft, setDraft] = useState<{ to: string; subject: string; text: string; html?: string }>({ to: '', subject: '', text: '' });
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
  const data = await api<{ requests: any[] }>("/api/quote-requests");
      setRows(data.requests);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load() }, [])

  const onSelect = async (req: any) => {
    setSelected(req)
    try {
  const d = await api<{ subject: string; text: string; html: string }>("/api/quote-requests/email-draft", { method: 'POST', body: JSON.stringify({ name: req.name, company: req.company }) })
      setDraft({ to: req.email, subject: d.subject, text: d.text, html: d.html })
    } catch (e) {
      console.error(e)
    }
  }

  const send = async () => {
    if (!draft.to) return alert('Missing recipient')
    setSending(true)
    try {
  await api<{ ok: true }>("/api/email/send", { method: 'POST', body: JSON.stringify({ to: draft.to, subject: draft.subject, text: draft.text, html: draft.html }) })
      // mark as replied
      if (selected) {
  await api<{ request: any }>("/api/quote-requests", { method: 'PATCH', body: JSON.stringify({ id: selected.id, status: 'Replied' }) })
        await load()
      }
      alert('Email sent (or printed to console if SMTP not set)')
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quote Requests</h1>
          <p className="text-gray-600">Reply quickly with pre-filled email drafts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Inbox</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loading ? 'Loading…' : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">When</th>
                    <th className="py-2 pr-4">From</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Company</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="py-2 pr-4">{new Date(r.created_at).toLocaleString()}</td>
                      <td className="py-2 pr-4">{r.name}</td>
                      <td className="py-2 pr-4">{r.email}</td>
                      <td className="py-2 pr-4">{r.company || '-'}</td>
                      <td className="py-2 pr-4">{r.status}</td>
                      <td className="py-2 pr-4"><Button size="sm" onClick={() => onSelect(r)}>Draft Reply</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compose</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <input className="w-full border p-2 rounded" placeholder="To" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
            <input className="w-full border p-2 rounded" placeholder="Subject" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
            <textarea className="w-full border p-2 rounded h-60" placeholder="Message" value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
            <div className="flex gap-2">
              <Button disabled={sending} onClick={send}>{sending ? 'Sending…' : 'Send Email'}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
