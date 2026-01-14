"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface ApiKey {
  id: string;
  name: string;
  created_at: string;
  last_used_at?: string | null;
  revoked_at?: string | null;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    setLoading(true);
    try {
      const res = await fetch("/api/api-keys", { cache: "no-store" });
      const data = await res.json();
      setKeys(data.keys || []);
    } catch (error) {
      console.error("Failed to load API keys", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!name) return;
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create API key");
      }
      setNewKey(data.api_key || null);
      setName("");
      await loadKeys();
    } catch (error: any) {
      alert(error.message);
    }
  }

  async function handleRevoke(id: string) {
    try {
      const res = await fetch(`/api/api-keys?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to revoke key");
      }
      await loadKeys();
    } catch (error: any) {
      alert(error.message);
    }
  }

  return (
    <div className="min-h-screen bg-space-deep p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-medium text-text-primary uppercase tracking-wider">
            API Keys
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Manage API access for integrations and partners.
          </p>
        </div>

        {demoMode && (
          <div className="p-4 rounded border border-orange-400 bg-orange-50 text-orange-700 text-sm">
            Demo mode is enabled. Changes are not saved.
          </div>
        )}

        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
              Create API Key
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 flex flex-wrap gap-4">
            <Input
              placeholder="Key name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={handleCreate} disabled={demoMode || !name}>
              Generate Key
            </Button>
          </CardContent>
          {newKey && (
            <CardContent className="pt-0">
              <div className="p-3 rounded border border-green-500 bg-green-50 text-green-700 text-sm">
                New API key (copy now, it won't be shown again): <br />
                <span className="font-mono break-all">{newKey}</span>
              </div>
            </CardContent>
          )}
        </Card>

        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
              Active Keys
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-text-secondary">Loading...</div>
            ) : keys.length === 0 ? (
              <div className="text-text-secondary">No API keys yet.</div>
            ) : (
              <div className="space-y-3">
                {keys.map((key) => (
                  <div
                    key={key.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 rounded border border-space-border bg-space-surface"
                  >
                    <div>
                      <div className="text-text-primary font-medium">{key.name}</div>
                      <div className="text-text-secondary text-xs">
                        Created: {new Date(key.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevoke(key.id)}
                      disabled={demoMode || Boolean(key.revoked_at)}
                    >
                      {key.revoked_at ? "Revoked" : "Revoke"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
