"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type SyncStatus = "connecting" | "live" | "offline";

type Options = {
  debounceMs?: number;   // how long to wait after last change before calling onChanged (default 400ms)
  channelName?: string;  // explicit channel name (default auto-generated)
};

/**
 * useRealtimeSync
 *
 * Subscribes to Supabase Realtime for one or more tables.
 * When ANY change (INSERT / UPDATE / DELETE) arrives from another user,
 * calls onChanged() so the page can refetch fresh data from the API.
 *
 * Pattern: realtime event = "ping" → refetch from secure server API.
 * This avoids RLS issues and keeps auth/data logic on the server.
 *
 * Usage:
 *   const { status, lastSync } = useRealtimeSync(
 *     ["ronyx_owner_operators", "ronyx_oo_documents"],
 *     () => refetch()
 *   );
 */
export function useRealtimeSync(
  tables: string[],
  onChanged: () => void,
  options: Options = {}
) {
  const { debounceMs = 400, channelName } = options;
  const [status,   setStatus]   = useState<SyncStatus>("connecting");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangedRef = useRef(onChanged);

  // Keep onChanged ref current without re-subscribing
  useEffect(() => { onChangedRef.current = onChanged; }, [onChanged]);

  useEffect(() => {
    if (!tables.length) return;

    const sb   = createClient();
    const name = channelName || `ronyx-sync-${tables.join("_")}-${Math.random().toString(36).slice(2)}`;

    const channel = sb.channel(name, { config: { broadcast: { self: false } } });

    tables.forEach((table) => {
      channel.on(
        // @ts-ignore — Supabase types vary by version
        "postgres_changes",
        { event: "*", schema: "public", table },
        (_payload: any) => {
          // Debounce: if 3 rows update at once, only call onChanged once
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            onChangedRef.current();
            setLastSync(new Date());
          }, debounceMs);
        }
      );
    });

    channel.subscribe((state: string) => {
      if (state === "SUBSCRIBED")    setStatus("live");
      if (state === "CLOSED")        setStatus("offline");
      if (state === "CHANNEL_ERROR") setStatus("offline");
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      sb.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join(","), channelName, debounceMs]);

  return { status, lastSync };
}

/**
 * LiveBadge — small indicator component to show sync status.
 * Import and render next to your page title.
 */
export function useLiveBadgeProps(status: SyncStatus, lastSync: Date | null) {
  const label = status === "live"
    ? "● Live"
    : status === "connecting"
    ? "◌ Connecting…"
    : "○ Offline";
  const color = status === "live" ? "#16a34a" : status === "connecting" ? "#d97706" : "#94a3b8";
  const title = lastSync
    ? `Last update from another user: ${lastSync.toLocaleTimeString()}`
    : "Waiting for changes from other users…";
  return { label, color, title };
}
