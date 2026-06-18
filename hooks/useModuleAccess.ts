"use client";

import { useEffect, useState } from "react";

type ModuleAccessResult = {
  blocked: boolean;
  loading: boolean;
  activeModules: string[];
};

type SubscriptionCache = {
  modules: string[];
  trialActive: boolean;
};

// In-memory cache. Shared across all hook instances so navigating between
// pages does not re-fetch. Expires after 60 seconds.
let cache: SubscriptionCache | null = null;
let cacheExpiry = 0;
const listeners: Array<(data: SubscriptionCache) => void> = [];

function notifyListeners(data: SubscriptionCache) {
  listeners.forEach((fn) => fn(data));
}

async function fetchSubscription(): Promise<SubscriptionCache> {
  const now = Date.now();
  if (cache && now < cacheExpiry) return cache;

  try {
    const res = await fetch("/api/ronyx/subscription");
    const data = await res.json();
    const modules: string[] = Array.isArray(data.activeModules) ? data.activeModules : [];
    const trialActive: boolean = data.trialActive === true;
    const result: SubscriptionCache = { modules, trialActive };
    cache = result;
    cacheExpiry = now + 60_000;
    notifyListeners(result);
    return result;
  } catch {
    // On network/parse error, fail open so transient failures never lock users out.
    return cache ?? { modules: [], trialActive: true };
  }
}

export function useModuleAccess(moduleSlug: string): ModuleAccessResult {
  const [state, setState] = useState<SubscriptionCache>(
    cache ?? { modules: [], trialActive: false }
  );
  const [loading, setLoading] = useState(!cache || Date.now() >= cacheExpiry);

  useEffect(() => {
    const handler = (data: SubscriptionCache) => setState(data);
    listeners.push(handler);
    fetchSubscription().then((result) => {
      setState(result);
      setLoading(false);
    });
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);

  // If trial is active, never block — trial unlocks all modules.
  const blocked = !loading && !state.trialActive && !state.modules.includes(moduleSlug);

  return {
    blocked,
    loading,
    activeModules: state.modules,
  };
}
