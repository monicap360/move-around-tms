"use client";

import { useState, useEffect } from "react";
import { Bell, X, AlertTriangle, CheckCircle, Clock, User } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

interface Notification {
  id: string;
  message: string;
  created_at: string;
  driver_id?: string;
  type?: 'compliance' | 'maintenance' | 'hr' | 'system';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  read?: boolean;
}

export default function NotificationsBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date>(new Date());

  useEffect(() => {
    loadNotifications();
    
    // Set up polling for new notifications every 30 seconds
    const interval = setInterval(pollNotifications, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/notifications?limit=25', {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN || ''}`,
        },
      });
      
      const data = await response.json();
      if (data.ok && data.items) {
        setNotifications(data.items.map((item: any) => ({
          ...item,
          type: classifyNotificationType(item.message),
          priority: classifyPriority(item.message),
          read: false
        })));
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const pollNotifications = async () => {
    try {
      const response = await fetch(`/api/admin/notifications?limit=10&since=${lastFetch.toISOString()}`, {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN || ''}`,
        },
      });
      
      const data = await response.json();
      if (data.ok && data.items && data.items.length > 0) {
        const newNotifications = data.items.map((item: any) => ({
          ...item,
          type: classifyNotificationType(item.message),
          priority: classifyPriority(item.message),
          read: false
        }));
        
        setNotifications(prev => [...newNotifications, ...prev].slice(0, 50));
        setLastFetch(new Date());
        
        // Show browser notification for critical items
        if ('Notification' in window && Notification.permission === 'granted') {
          const criticalItems = newNotifications.filter((n: any) => n.priority === 'critical');
          criticalItems.forEach((item: any) => {
            new Notification('Ronyx Logistics - Critical Alert', {
              body: item.message,
              icon: '/favicon.ico',
              tag: item.id
            });
          });
        }
      }
    } catch (error) {
      console.error('Error polling notifications:', error);
    }
  };

  const classifyNotificationType = (message: string): 'compliance' | 'maintenance' | 'hr' | 'system' => {
    const msg = message.toLowerCase();
    if (msg.includes('compliance') || msg.includes('expir') || msg.includes('dot')) return 'compliance';
    if (msg.includes('maintenance') || msg.includes('dvir') || msg.includes('defect')) return 'maintenance';
    if (msg.includes('driver') || msg.includes('employee') || msg.includes('hr')) return 'hr';
    return 'system';
  };

  const classifyPriority = (message: string): 'low' | 'medium' | 'high' | 'critical' => {
    const msg = message.toLowerCase();
    if (msg.includes('critical') || msg.includes('urgent') || msg.includes('immediate')) return 'critical';
    if (msg.includes('expires today') || msg.includes('overdue')) return 'high';
    if (msg.includes('expires') || msg.includes('due')) return 'medium';
    return 'low';
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'compliance': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'maintenance': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'hr': return <User className="w-4 h-4 text-blue-500" />;
      default: return <CheckCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 border-red-200';
      case 'high': return 'bg-orange-100 border-orange-200';
      case 'medium': return 'bg-yellow-100 border-yellow-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const criticalCount = notifications.filter(n => n.priority === 'critical' && !n.read).length;

  // Request notification permission on first render
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="relative">
      {/* Bell Icon */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge 
            variant={criticalCount > 0 ? "destructive" : "secondary"}
            className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs min-w-[1.25rem] h-5 flex items-center justify-center"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-200"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <Clock className="w-5 h-5 mx-auto mb-2" />
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                No notifications
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.slice(0, 20).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50' : ''
                    } ${getPriorityColor(notification.priority || 'low')}`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      {getNotificationIcon(notification.type || 'system')}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 break-words">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                      {notification.priority === 'critical' && (
                        <Badge variant="destructive" className="text-xs">
                          CRITICAL
                        </Badge>
                      )}
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="border-t bg-gray-50 p-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                }}
                className="w-full text-sm"
              >
                Mark All as Read
              </Button>
            </div>
          )}
=======
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
>>>>>>> 34e73bd382610bff689903bedc8d62eed355fc8a
        </div>
      )}
    </div>
  );
}
