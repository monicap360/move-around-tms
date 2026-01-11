"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Upload, Image, FileText, Building, Truck } from "lucide-react";

type UploadType =
  | "driver_document"
  | "company_logo"
  | "ticket_template"
  | "form_template";

export default function HRUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<any>(null);
  const [driverId, setDriverId] = useState<string>("");
  const [uploadType, setUploadType] = useState<UploadType>("driver_document");
  const [description, setDescription] = useState<string>("");

  async function handleUpload() {
    try {
      if (!file) return alert("Select a file first");

      setStatus("Uploading…");

      // Determine storage bucket and path based on upload type
      let bucket = "hr_docs";
      let path = "";

      switch (uploadType) {
        case "company_logo":
          bucket = "company_assets";
          path = `logos/${Date.now()}-${file.name}`;
          break;
        case "ticket_template":
          bucket = "company_assets";
          path = `templates/tickets/${Date.now()}-${file.name}`;
          break;
        case "form_template":
          bucket = "company_assets";
          path = `templates/forms/${Date.now()}-${file.name}`;
          break;
        default:
          bucket = "hr_docs";
          path = `uploads/${new Date().toISOString().split("T")[0]}/${Date.now()}-${file.name}`;
      }

      const { data: uploadRes, error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: false, cacheControl: "3600" });

      if (uploadErr) {
        setStatus("Upload failed: " + uploadErr.message);
        return;
      }

      // For company assets, just confirm upload
      if (uploadType !== "driver_document") {
        setStatus(`✅ ${uploadType.replace("_", " ")} uploaded successfully!`);
        setResult({
          type: uploadType,
          path: uploadRes.path,
          description: description,
          message: "File uploaded to company assets storage",
        });

        // Store metadata in database via API
        try {
          const assetResponse = await fetch("/api/company-assets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              asset_type: uploadType,
              file_path: uploadRes.path,
              original_filename: file.name,
              description:
                description ||
                `${uploadType.replace("_", " ")} uploaded ${new Date().toLocaleDateString()}`,
              file_size: file.size,
              mime_type: file.type,
              tags:
                uploadType === "company_logo"
                  ? ["branding", "official"]
                  : uploadType === "ticket_template"
                    ? ["template", "billing"]
                    : ["template", "form"],
              metadata: {
                width:
                  uploadType === "company_logo" &&
                  file.type.startsWith("image/")
                    ? "auto-detected"
                    : null,
                height:
                  uploadType === "company_logo" &&
                  file.type.startsWith("image/")
                    ? "auto-detected"
                    : null,
                upload_session: Date.now(),
              },
            }),
          });

          if (assetResponse.ok) {
            const assetData = await assetResponse.json();
            setResult({
              ...result,
              database_record: assetData.data,
              message: "File uploaded and metadata saved successfully",
            });
          }
        } catch (dbError) {
          console.warn("Failed to save asset metadata:", dbError);
        }
        return;
      }

      // For driver documents, continue with OCR processing
      const { data: signed, error: signedErr } = await supabase.storage
        .from("hr_docs")
        .createSignedUrl(uploadRes.path, 60 * 10); // 10 minutes

      if (signedErr || !signed?.signedUrl) {
        setStatus("Failed to create signed URL");
        return;
      }

      setStatus("Scanning document…");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ocr-scan`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            kind: "hr",
            file_url: signed.signedUrl,
            driverId: driverId || undefined,
          }),
        },
      );

      const ocr = await res.json();
      if (!res.ok) {
        setStatus("Scan failed: " + (ocr?.message || res.statusText));
        return;
      }

      setResult(ocr);
      setStatus("Scan complete ✅");
    } catch (e: any) {
      setStatus(e?.message || "Unexpected error");
    }
  }

  const uploadTypeConfig = {
    driver_document: {
      title: "Driver Document",
      description:
        "Upload driver licenses, medical certificates, or other HR documents",
      icon: FileText,
      accept: "image/*,application/pdf",
      showDriverId: true,
    },
    company_logo: {
      title: "Company Logo",
      description:
        "Upload Ronyx Logistics LLC company logo for use in documents and forms",
      icon: Building,
      accept: "image/*",
      showDriverId: false,
    },
    ticket_template: {
      title: "Ticket Template",
      description:
        "Upload blank ticket templates for reference and form generation",
      icon: Truck,
      accept: "image/*,application/pdf",
      showDriverId: false,
    },
    form_template: {
      title: "Form Template",
      description: "Upload blank forms, contracts, or other document templates",
      icon: Image,
      accept: "image/*,application/pdf",
      showDriverId: false,
    },
  };

  const currentConfig = uploadTypeConfig[uploadType];

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8 text-gray-800">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-700 mb-2">
          Ronyx Logistics LLC
        </h1>
        <p className="text-gray-600 mb-6">
          3741 Graves Ave, Groves, Texas 77619
        </p>

        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          Document & Asset Upload Center
        </h2>

        {/* Upload Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Object.entries(uploadTypeConfig).map(([type, config]) => {
            const IconComponent = config.icon;
            return (
              <div
                key={type}
                className="cursor-pointer transition-all hover:shadow-lg"
                onClick={() => setUploadType(type as UploadType)}
              >
                <Card
                  className={`${
                    uploadType === type ? "ring-2 ring-blue-500 bg-blue-50" : ""
                  }`}
                >
                  <CardContent className="p-4 text-center">
                    <IconComponent
                      className={`w-8 h-8 mx-auto mb-3 ${
                        uploadType === type ? "text-blue-600" : "text-gray-500"
                      }`}
                    />
                    <h3 className="font-semibold text-sm">{config.title}</h3>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Upload Form */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              {currentConfig.title}
            </CardTitle>
            <p className="text-gray-600">{currentConfig.description}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Description Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <Input
                value={description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDescription(e.target.value)
                }
                placeholder={`Describe this ${uploadType.replace("_", " ")}...`}
                className="w-full"
              />
            </div>

            {/* Driver ID Field (only for driver documents) */}
            {currentConfig.showDriverId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Driver ID (optional)
                </label>
                <Input
                  value={driverId}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setDriverId(e.target.value)
                  }
                  placeholder="Driver ID (optional to override auto-match)"
                  className="w-full"
                />
              </div>
            )}

            {/* Enhanced File Upload with Drag & Drop */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select File
              </label>
              <div
                className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer ${
                  file
                    ? "border-green-400 bg-green-50"
                    : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                }`}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.add(
                    "border-blue-500",
                    "bg-blue-50",
                  );
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.remove(
                    "border-blue-500",
                    "bg-blue-50",
                  );
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.remove(
                    "border-blue-500",
                    "bg-blue-50",
                  );
                  const files = e.dataTransfer.files;
                  if (files.length > 0) {
                    setFile(files[0]);
                  }
                }}
                onClick={() => document.getElementById("file-input")?.click()}
              >
                {file ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center">
                      <Upload className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="text-sm font-medium text-green-800">
                      {file.name}
                    </p>
                    <p className="text-xs text-green-600">
                      {(file.size / 1024 / 1024).toFixed(1)} MB • Ready to
                      upload
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFile(null);
                      }}
                      className="mt-2"
                    >
                      Choose Different File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center">
                      <Upload className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">
                      Drag & drop your file here
                    </p>
                    <p className="text-xs text-gray-500">
                      or click to browse • {currentConfig.accept}
                    </p>
                  </div>
                )}

                <input
                  id="file-input"
                  type="file"
                  accept={currentConfig.accept}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </div>
            </div>

            {/* Upload Button */}
            <Button onClick={handleUpload} disabled={!file} className="w-full">
              <Upload className="w-4 h-4 mr-2" />
              {uploadType === "driver_document" ? "Upload & Scan" : "Upload"}
            </Button>

            {/* Status */}
            {status && (
              <div className="p-3 rounded-md bg-gray-50 text-gray-700">
                {status}
              </div>
            )}

            {/* Results */}
            {result && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">Upload Result</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs whitespace-pre-wrap bg-gray-50 p-3 rounded overflow-auto max-h-96">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mt-8 max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-lg">Upload Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-2">
            <p>
              <strong>Company Logo:</strong> Upload high-resolution logo files
              (PNG, JPG, SVG) for use in documents, forms, and system branding.
            </p>
            <p>
              <strong>Ticket Templates:</strong> Upload blank ticket templates
              to help analyze required fields and generate digital forms.
            </p>
            <p>
              <strong>Driver Documents:</strong> Upload driver licenses, medical
              certificates, and other HR documents for OCR processing and
              compliance tracking.
            </p>
            <p>
              <strong>Form Templates:</strong> Upload blank contracts,
              applications, or other forms for digitization and automation.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
