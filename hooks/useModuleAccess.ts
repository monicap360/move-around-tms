"use client";

import { useEffect, useState } from "react";

type ModuleAccessResult = {
  blocked: boolean;
  loading: boolean;
  activeModules: string[];
};

// Simple in-memory cache so navigating between pages doesn't re-fetch every time.
// Cache expires after 60 seconds.
let cachedModules: string[] | null = null;
let cacheExpiry = 0;
const listeners: Array<(modules: string[]) => void> = [];

function notifyListeners(modules: string[]) {
  listeners.forEach((fn) => fn(modules));
}

async function fetchModules(): Promise<string[]> {
  const now = Date.now();
  if (cachedModules && now < cacheExpiry) return cachedModules;
  try {
    const res = await fetch("/api/ronyx/subscription");
    const data = await res.json();
    const modules: string[] = Array.isArray(data.activeModules) ? data.activeModules : [];
    cachedModules = modules;
    cacheExpiry = now + 60_000;
    notifyListeners(modules);
    return modules;
  } catch {
    // On error, default to allowing access (fail open) to avoid locking out users on network issues
    return cachedModules ?? [];
  }
}

export function useModuleAccess(moduleSlug: string): ModuleAccessResult {
  const [activeModules, setActiveModules] = useState<string[]>(cachedModules ?? []);
  const [loading, setLoading] = useState(!cachedModules || Date.now() >= cacheExpiry);

  useEffect(() => {
    // Subscribe to cache updates
    listeners.push(setActiveModules);
    fetchModules().then((modules) => {
      setActiveModules(modules);
      setLoading(false);
    });
    return () => {
      const idx = listeners.indexOf(setActiveModules);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);

  return {
    blocked: !loading && !activeModules.includes(moduleSlug),
    loading,
    activeModules,
  };
}
