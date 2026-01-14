"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface DocumentItem {
  id: string;
  type: string;
  driver_name: string;
  status: string;
  created_at: string;
  image_url?: string | null;
}

export default function DocumentVaultPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    setLoading(true);
    try {
      const res = await fetch("/api/documents", { cache: "no-store" });
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error("Failed to load documents", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-space-deep p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-medium text-text-primary uppercase tracking-wider">
            Document Vault
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Centralized access to driver and compliance documents.
          </p>
        </div>

        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-text-secondary">Loading...</div>
            ) : documents.length === 0 ? (
              <div className="text-text-secondary">No documents found.</div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 rounded border border-space-border bg-space-surface"
                  >
                    <div>
                      <div className="text-text-primary font-medium">{doc.type}</div>
                      <div className="text-text-secondary text-xs">
                        {doc.driver_name} • {doc.status}
                      </div>
                    </div>
                    <div className="text-xs text-text-secondary">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </div>
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
