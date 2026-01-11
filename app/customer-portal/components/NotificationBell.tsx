"use client";
import { useEffect, useState } from "react";

interface Notification {
  id: string;
  type: "status" | "invoice" | "chat" | "exception";
  message: string;
  timestamp: string;
  read: boolean;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // In production, fetch notifications from backend or Supabase
    async function fetchNotifications() {
      try {
        const res = await fetch("/api/notifications/customer");
        const data = await res.json();
        setNotifications(
          Array.isArray(data.notifications) ? data.notifications : [],
        );
      } catch {
        setNotifications([]);
      }
    }
    fetchNotifications();
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative focus:outline-none"
      >
        <span className="inline-block w-6 h-6 bg-blue-600 rounded-full text-white flex items-center justify-center">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 7.165 6 9.388 6 12v2.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded shadow-lg z-50 border">
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <span className="font-semibold">Notifications</span>
            <button className="text-xs text-blue-600" onClick={markAllRead}>
              Mark all read
            </button>
          </div>
          <ul className="max-h-80 overflow-y-auto divide-y">
            {notifications.length === 0 && (
              <li className="p-4 text-gray-400">No notifications</li>
            )}
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`p-4 ${n.read ? "bg-gray-50" : "bg-blue-50"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${n.type === "status" ? "bg-green-500" : n.type === "invoice" ? "bg-yellow-500" : n.type === "chat" ? "bg-blue-500" : "bg-red-500"}`}
                  ></span>
                  <span className="text-xs text-gray-500">
                    {new Date(n.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm">{n.message}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
