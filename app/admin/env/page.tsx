"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";

type EnvHealth = {
  ok: boolean;
  env: Record<string, boolean>;
};

export default function EnvHealthPage() {
  const [data, setData] = useState<EnvHealth | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/env/health", { cache: "no-store" });
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const json = (await res.json()) as EnvHealth;
        setData(json);
      } catch (e: any) {
        setError(e?.message || "Failed to load env health");
      }
    }
    load();
  }, []);

  return (
    <div className="p-6">
      <Card className="shadow-lg border bg-white max-w-2xl">
        <CardHeader>
          <CardTitle>Environment Health</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          {!data && !error && <p className="text-gray-500">Loading…</p>}

          {data && (
            <div className="space-y-2">
              {Object.entries(data.env).map(([key, present]) => (
                <div key={key} className="flex items-center justify-between border-b py-2">
                  <span className="text-sm text-gray-700 font-medium">{key}</span>
                  <span
                    className={
                      present
                        ? "text-green-700 text-sm font-semibold"
                        : "text-red-700 text-sm font-semibold"
                    }
                  >
                    {present ? "Present" : "Missing"}
                  </span>
                </div>
              ))}
              <p className="text-xs text-gray-500 mt-3">
                This page only displays whether a variable is set. It does not reveal any secret values.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
