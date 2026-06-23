"use client";

import { useEffect, useState } from "react";

const CARRIER_SLUGS = new Set(["ronyx", "solis", "garcia", "ymr", "leah", "jjalvarado"]);

export type OrgInfo = {
  slug: string;
  name: string;
  id: string;
  status: string;
  account_type: string;
  subscription_status: string;
  bypass_subscription: boolean;
  subdomain_url: string;
};

type State = {
  slug: string;
  org: OrgInfo | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
};

function detectSlug(): string {
  if (typeof window === "undefined") return "ronyx";
  const host = window.location.hostname;
  const parts = host.split(".");
  if (parts.length >= 3) {
    const sub = parts[0].toLowerCase();
    if (CARRIER_SLUGS.has(sub) || sub === "admin") return sub;
  }
  return "ronyx";
}

export function useOrgSubdomain(): State {
  const slug = detectSlug();
  const isAdmin = slug === "admin";

  const [state, setState] = useState<State>({
    slug,
    org: null,
    loading: !isAdmin,
    error: null,
    isAdmin,
  });

  useEffect(() => {
    if (isAdmin) return;

    let cancelled = false;
    fetch(`/api/org/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.org) {
          setState((s) => ({ ...s, org: d.org, loading: false }));
        } else {
          setState((s) => ({ ...s, error: d.error ?? "Unknown org", loading: false }));
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setState((s) => ({ ...s, error: String(e), loading: false }));
        }
      });

    return () => { cancelled = true; };
  }, [slug, isAdmin]);

  return state;
}

// Lightweight synchronous version — just returns the slug from the hostname.
// Use this in components that only need to know WHICH org without full metadata.
export function getOrgSlugSync(): string {
  return detectSlug();
}
