"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Upload, CheckCircle, AlertCircle, Shield } from "lucide-react";

interface WatermarkOptions {
  text?: string;
  position?: "center" | "diagonal" | "tiled" | "bottom-right";
  purpose?: string;
}

export default function WatermarkUploader({
  organizationId,
  userId,
  onComplete,
}: {
  organizationId: string;
  userId: string;
  onComplete?: (result: { documentId: string; url: string }) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<WatermarkOptions>({
    text: "CONFIDENTIAL",
    position: "diagonal",
    purpose: "",
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        setError("Only PDF files are supported");
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("organizationId", organizationId);
      formData.append("userId", userId);
      if (options.text) formData.append("watermarkText", options.text);
      if (options.position) formData.append("watermarkPosition", options.position);
      if (options.purpose) formData.append("purpose", options.purpose);

      const response = await fetch("/api/documents/watermark", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setResult(data);
      if (onComplete) {
        onComplete({ documentId: data.documentId, url: data.url });
      }
    } catch (err: any) {
      setError(err.message || "Failed to upload and watermark document");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Add Digital Watermark & Provenance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="file">Select PDF Document</Label>
          <Input
            id="file"
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="mt-1"
          />
          {file && (
            <p className="text-sm text-gray-600 mt-1">
              Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="watermarkText">Watermark Text</Label>
          <Input
            id="watermarkText"
            value={options.text}
            onChange={(e) =>
              setOptions({ ...options, text: e.target.value })
            }
            placeholder="CONFIDENTIAL"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="position">Watermark Position</Label>
          <select
            id="position"
            value={options.position}
            onChange={(e) =>
              setOptions({
                ...options,
                position: e.target.value as WatermarkOptions["position"],
              })
            }
            className="mt-1 w-full border rounded px-3 py-2"
          >
            <option value="diagonal">Diagonal (Default)</option>
            <option value="center">Center</option>
            <option value="tiled">Tiled Pattern</option>
            <option value="bottom-right">Bottom Right with Timestamp</option>
          </select>
        </div>

        <div>
          <Label htmlFor="purpose">Purpose (Optional)</Label>
          <Input
            id="purpose"
            value={options.purpose}
            onChange={(e) =>
              setOptions({ ...options, purpose: e.target.value })
            }
            placeholder="e.g., Contract, Invoice, Certificate"
            className="mt-1"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 rounded p-3 space-y-2">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span className="font-semibold">Document watermarked successfully!</span>
            </div>
            <div className="text-sm space-y-1">
              <p>
                <strong>Document ID:</strong> {result.documentId}
              </p>
              <p>
                <strong>Hash:</strong> {result.metadata.hash.substring(0, 16)}...
              </p>
              <p>
                <strong>Timestamp:</strong>{" "}
                {new Date(result.metadata.timestamp).toLocaleString()}
              </p>
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                View Watermarked Document
              </a>
            </div>
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full"
        >
          {uploading ? (
            <>Processing...</>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload & Add Watermark
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
