"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Shield, CheckCircle, AlertCircle, Search } from "lucide-react";

export default function DocumentVerifier() {
  const [documentId, setDocumentId] = useState("");
  const [hash, setHash] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!documentId || !hash) {
      setError("Please provide both Document ID and Hash");
      return;
    }

    setVerifying(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        `/api/documents/watermark/verify?documentId=${documentId}&hash=${hash}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to verify document");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Verify Document Integrity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="documentId">Document ID</Label>
          <Input
            id="documentId"
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
            placeholder="Enter document ID"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="hash">Expected Hash (SHA-256)</Label>
          <Input
            id="hash"
            value={hash}
            onChange={(e) => setHash(e.target.value)}
            placeholder="Enter expected hash"
            className="mt-1 font-mono text-sm"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {result && (
          <div
            className={`border rounded p-3 space-y-2 ${
              result.valid
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div
              className={`flex items-center gap-2 ${
                result.valid ? "text-green-700" : "text-red-700"
              }`}
            >
              {result.valid ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span className="font-semibold">
                {result.valid
                  ? "Document integrity verified"
                  : "Document integrity check failed"}
              </span>
            </div>

            <div className="text-sm space-y-1">
              <p>
                <strong>Document ID:</strong> {result.documentId}
              </p>
              <p>
                <strong>Expected Hash:</strong>{" "}
                {result.expectedHash.substring(0, 16)}...
              </p>
              <p>
                <strong>Provided Hash:</strong>{" "}
                {result.providedHash.substring(0, 16)}...
              </p>
              {result.metadata && (
                <>
                  <p>
                    <strong>Created:</strong>{" "}
                    {new Date(result.metadata.timestamp).toLocaleString()}
                  </p>
                  <p>
                    <strong>Organization:</strong> {result.metadata.organization_id}
                  </p>
                  {result.metadata.purpose && (
                    <p>
                      <strong>Purpose:</strong> {result.metadata.purpose}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        <Button
          onClick={handleVerify}
          disabled={!documentId || !hash || verifying}
          className="w-full"
        >
          {verifying ? (
            <>Verifying...</>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Verify Document
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
