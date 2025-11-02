"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Notification = {
  id: string;
  message: string;
  created_at: string;
  driver_id: string | null;
};

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const lastSeenRef = useRef<string | null>(null);

  useEffect(() => {
    // Restore last seen from localStorage
    const stored = localStorage.getItem("notifications:lastSeen");
    if (stored) lastSeenRef.current = stored;

    // Initial load
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("notifications")
          .select("id, message, created_at, driver_id")
          .order("created_at", { ascending: false })
          .limit(20);
        if (error) throw error;
        setItems(data || []);
      } catch (e: any) {
        setError(e.message || "Failed to load notifications");
      } finally {
        setLoading(false);
      }
    })();

    // Realtime subscription (if table is enabled for Realtime and RLS allows)
    const channel = supabase
      .channel("public:notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
        const row = payload.new as Notification;
        setItems((prev) => [row, ...prev].slice(0, 20));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const newCount = useMemo(() => {
    if (!lastSeenRef.current) return 0;
    const last = new Date(lastSeenRef.current).getTime();
    return items.filter((n) => new Date(n.created_at).getTime() > last).length;
  }, [items]);

  function summarizeNotifications(list: Notification[]) {
    if (list.length === 0) return 'No notifications.';
    // Extract doc types and dates heuristically
    const docTypeCounts: Record<string, number> = {};
    let soonest: { date: string; msg: string } | null = null;
    for (const n of list) {
      const m1 = n.message.match(/Document\s([^\s!]+)/i) || n.message.match(/Expiring document:\s([^\s]+)/i);
      const docType = m1?.[1]?.replace(/[:]/g, '') || 'Other';
      docTypeCounts[docType] = (docTypeCounts[docType] || 0) + 1;
      const m2 = n.message.match(/on\s(\d{4}-\d{2}-\d{2})/) || n.message.match(/(\d{4}-\d{2}-\d{2})/);
      const d = m2?.[1];
      if (d) {
        if (!soonest || d < soonest.date) soonest = { date: d, msg: n.message };
      }
    }
    const total = list.length;
    const parts = Object.entries(docTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([t, c]) => `${c} ${t}`);
    const head = `${total} expiring document${total === 1 ? '' : 's'}`;
    const types = parts.length ? `: ${parts.join(', ')}` : '';
    const soon = soonest ? `. Soonest: ${soonest.date}` : '';
    return head + types + soon;
  }

  function onSummarize() {
    try {
      const s = summarizeNotifications(items);
      setSummary(s);
    } catch (e: any) {
      setSummary('Unable to summarize.');
    }
  }

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      const now = new Date().toISOString();
      lastSeenRef.current = now;
      localStorage.setItem("notifications:lastSeen", now);
    }
  }

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={toggleOpen}
        className="relative inline-flex items-center justify-center h-9 w-9 rounded-full bg-gray-800 hover:bg-gray-700 text-white"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {newCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
            {newCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black/5 z-50">
          <div className="p-3 border-b">
            <div className="text-sm font-semibold">Notifications</div>
            {loading && <div className="text-xs text-gray-500">Loading…</div>}
            {error && <div className="text-xs text-red-600">{error}</div>}
            <div className="mt-2 flex items-center gap-2">
              <button onClick={onSummarize} className="px-2 py-1 text-xs rounded bg-gray-800 text-white hover:bg-gray-700">Summarize</button>
              {summary && <div className="text-[11px] text-gray-700">{summary}</div>}
            </div>
          </div>
          <ul className="max-h-96 overflow-auto">
            {items.length === 0 && !loading ? (
              <li className="p-3 text-sm text-gray-500">No notifications</li>
            ) : (
              items.map((n) => (
                <li key={n.id} className="p-3 border-b last:border-0">
                  <div className="text-sm text-gray-800">{n.message}</div>
                  <div className="text-[11px] text-gray-500 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
