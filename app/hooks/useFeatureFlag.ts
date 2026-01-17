"use client";

import { useEffect, useState } from "react";

type FeatureFlag = {
  key: string;
  enabled: boolean;
  description?: string | null;
  scope?: string | null;
};

export function useFeatureFlag(key: string, scope = "global") {
  const [flag, setFlag] = useState<FeatureFlag | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/feature-flags?key=${encodeURIComponent(key)}&scope=${encodeURIComponent(scope)}`);
        const data = await res.json();
        if (isMounted) {
          setFlag(data.flag || null);
        }
      } catch (err) {
        console.error("Failed to load feature flag", err);
        if (isMounted) {
          setFlag(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [key, scope]);

  return {
    enabled: flag?.enabled ?? false,
    flag,
    loading,
  };
}
