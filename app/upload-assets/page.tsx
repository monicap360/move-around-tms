"use client";
/* eslint-disable @next/next/no-img-element */
import { useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import DragDropUploader, {
  type FileWithPreview,
} from "../components/ui/drag-drop-uploader";
import FilePreviewCard, {
  type FilePreviewData,
} from "../components/ui/file-preview-card";
import { MultiUploadProgress } from "../components/ui/upload-progress";
import { safeAlert } from "../lib/utils/alert";
import {
  Upload,
  Building,
  Truck,
  Check,
  AlertCircle,
  Download,
  Trash2,
  FileText,
  X,
  Image as ImageIcon,
} from "lucide-react";

interface FilePreview {
  file: File;
  preview?: string;
  type: "company_logo" | "ticket_template";
  description: string;
  id: string;
}

interface UploadResult {
  success: boolean;
  fileName: string;
  type: string;
  path?: string;
  error?: string;
}

interface UploadProgress {
  id: string;
  fileName: string;
  progress: number;
  status: "uploading" | "processing" | "success" | "error";
  message?: string;
}

export default function AssetUploadPage() {
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Enhanced drag and drop handlers with progress tracking
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFiles = (fileList: File[]) => {
    const validFiles = fileList.filter((file) => {
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB max
      return (isImage || isPdf) && isValidSize;
    });

    if (validFiles.length !== fileList.length) {
      const skipped = fileList.length - validFiles.length;
      safeAlert(
        `${skipped} files were skipped (unsupported format or too large)`,
      );
    }

    const newFiles: FilePreview[] = validFiles.map((file) => ({
      file,
      preview: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined,
      type: file.name.toLowerCase().includes("logo")
        ? "company_logo"
        : "ticket_template",
      description: "",
      id: Math.random().toString(36).substr(2, 9),
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      handleFiles(Array.from(fileList));
    }
    // Reset input to allow selecting the same files again
    e.target.value = "";
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === id);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const updateFileType = (
    id: string,
    type: "company_logo" | "ticket_template",
  ) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, type } : f)));
  };

  const updateDescription = (id: string, description: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, description } : f)),
    );
  };

  const uploadFile = async (
    filePreview: FilePreview,
  ): Promise<UploadResult> => {
    const progressId = filePreview.id;

    // Initialize progress tracking
    setUploadProgress((prev) => [
      ...prev,
      {
        id: progressId,
        fileName: filePreview.file.name,
        progress: 0,
        status: "uploading",
      },
    ]);

    const updateProgress = (
      progress: number,
      status?: "uploading" | "processing" | "success" | "error",
      message?: string,
    ) => {
      setUploadProgress((prev) =>
        prev.map((p) =>
          p.id === progressId
            ? { ...p, progress, status: status || p.status, message }
            : p,
        ),
      );
    };

    try {
      const { file, type, description } = filePreview;

      updateProgress(10, "uploading", "Preparing upload...");

      // Debug: Log Supabase client status
      console.log("🔍 Supabase client:", !!supabase);
      console.log("🔍 File details:", {
        name: file.name,
        size: file.size,
        type: file.type,
      });

      // Determine storage path
      const timestamp = Date.now();
      const bucket = "company_assets";
      const path =
        type === "company_logo"
          ? `logos/${timestamp}-${file.name}`
          : `templates/tickets/${timestamp}-${file.name}`;

      console.log("🔍 Upload path:", { bucket, path });

      updateProgress(30, "uploading", "Uploading to storage...");

      // Upload to Supabase Storage
      const { data: uploadRes, error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: false, cacheControl: "3600" });

      if (uploadErr) {
        console.error("❌ Supabase Storage Error:", uploadErr);
        updateProgress(0, "error", uploadErr.message);
        return {
          success: false,
          fileName: file.name,
          type,
          error: uploadErr.message,
        };
      }

      updateProgress(70, "processing", "Saving metadata...");

      console.log("✅ Storage upload successful:", uploadRes);

      // Save metadata to database
      const assetPayload = {
        asset_type: type,
        file_path: uploadRes.path,
        original_filename: file.name,
        description:
          description ||
          `${type.replace("_", " ")} uploaded ${new Date().toLocaleDateString()}`,
        file_size: file.size,
        mime_type: file.type,
        tags:
          type === "company_logo"
            ? ["branding", "official"]
            : ["template", "billing"],
        metadata: {
          uploaded_from: "enhanced_upload_page",
          upload_session: timestamp,
        },
      };

      console.log("🔍 API payload:", assetPayload);

      const assetResponse = await fetch("/api/company-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assetPayload),
      });

      console.log("🔍 API response status:", assetResponse.status);

      if (!assetResponse.ok) {
        const errorText = await assetResponse.text();
        console.error("❌ API Error:", errorText);
        updateProgress(0, "error", `API Error: ${assetResponse.status}`);
        return {
          success: false,
          fileName: file.name,
          type,
          error: `Failed to save metadata: ${assetResponse.status}`,
        };
      }

      updateProgress(100, "success", "Upload completed successfully!");

      return {
        success: true,
        fileName: file.name,
        type,
        path: uploadRes.path,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      updateProgress(0, "error", errorMsg);

      return {
        success: false,
        fileName: filePreview.file.name,
        type: filePreview.type,
        error: errorMsg,
      };
    }
  };

  const handleUploadAll = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setUploadResults([]);
    setUploadProgress([]);

    // Process uploads sequentially to avoid overwhelming the server
    const results: UploadResult[] = [];

    for (const file of files) {
      const result = await uploadFile(file);
      results.push(result);

      // Small delay between uploads
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setUploadResults(results);

    // Clear successfully uploaded files
    const successfulIds = files
      .filter((_, index) => results[index].success)
      .map((f) => f.id);

    successfulIds.forEach((id) => removeFile(id));

    // Clear upload progress after a delay
    setTimeout(() => {
      setUploadProgress([]);
    }, 3000);

    setUploading(false);
  };

  const cancelAllUploads = () => {
    setUploading(false);
    setUploadProgress([]);
    // In a real implementation, you'd cancel ongoing uploads here
  };

  const cancelSingleUpload = (id: string) => {
    setUploadProgress((prev) => prev.filter((p) => p.id !== id));
    // In a real implementation, you'd cancel the specific upload here
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Asset Upload Center
          </h1>
          <p className="text-gray-600 text-lg">
            Upload company logos and ticket templates
          </p>
          <div className="mt-4 text-sm text-gray-500">
            <span className="inline-flex items-center gap-1">
              <Building className="w-4 h-4" />
              Ronyx Logistics LLC
            </span>
            <span className="mx-2">•</span>
            <span>3741 Graves Ave, Groves, Texas 77619</span>
          </div>
        </div>

        {/* Upload Zone */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer ${
                dragActive
                  ? "border-blue-500 bg-blue-50 scale-105"
                  : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div
                    className={`p-4 rounded-full ${dragActive ? "bg-blue-100" : "bg-gray-100"}`}
                  >
                    <Upload
                      className={`w-12 h-12 ${dragActive ? "text-blue-600" : "text-gray-400"}`}
                    />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    {dragActive ? "Drop files here" : "Drag & drop files here"}
                  </h3>
                  <p className="text-gray-600 mb-4">or click to select files</p>
                  <Button
                    variant="outline"
                    className="border-2"
                    onClick={() => {
                      document.getElementById("file-input")?.click();
                    }}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Files
                  </Button>
                  <input
                    id="file-input"
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </div>
                <div className="text-sm text-gray-500">
                  <p>Supports: JPG, PNG, GIF, WebP, PDF</p>
                  <p>Maximum file size: 10MB each</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Previews */}
        {files.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Files Ready to Upload ({files.length})</span>
                <Button
                  onClick={handleUploadAll}
                  disabled={uploading || files.length === 0}
                  className="min-w-32"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload All
                    </>
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {files.map((filePreview) => (
                  <div
                    key={filePreview.id}
                    className="border rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex items-start gap-4">
                      {/* Preview */}
                      <div className="flex-shrink-0">
                        {filePreview.preview ? (
                          <img
                            src={filePreview.preview}
                            alt="Preview"
                            className="w-20 h-20 object-cover rounded-lg border"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-200 rounded-lg border flex items-center justify-center">
                            <FileText className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-gray-800 truncate">
                            {filePreview.file.name}
                          </h4>
                          <span className="text-sm text-gray-500">
                            ({(filePreview.file.size / 1024 / 1024).toFixed(1)}{" "}
                            MB)
                          </span>
                        </div>

                        {/* Type Selection */}
                        <div className="flex gap-2 mb-3">
                          <Button
                            size="sm"
                            variant={
                              filePreview.type === "company_logo"
                                ? "default"
                                : "outline"
                            }
                            onClick={() =>
                              updateFileType(filePreview.id, "company_logo")
                            }
                            className="text-xs"
                          >
                            <Building className="w-3 h-3 mr-1" />
                            Company Logo
                          </Button>
                          <Button
                            size="sm"
                            variant={
                              filePreview.type === "ticket_template"
                                ? "default"
                                : "outline"
                            }
                            onClick={() =>
                              updateFileType(filePreview.id, "ticket_template")
                            }
                            className="text-xs"
                          >
                            <Truck className="w-3 h-3 mr-1" />
                            Ticket Template
                          </Button>
                        </div>

                        {/* Description */}
                        <Input
                          placeholder="Add description (optional)"
                          value={filePreview.description}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updateDescription(filePreview.id, e.target.value)
                          }
                          className="text-sm"
                        />
                      </div>

                      {/* Remove Button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFile(filePreview.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Progress */}
        {uploadProgress.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Upload Progress ({uploadProgress.length} files)</span>
                {uploading && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelAllUploads}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel All
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {uploadProgress.map((upload) => (
                  <div key={upload.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {upload.fileName}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {upload.progress}%
                        </span>
                        {upload.status === "uploading" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelSingleUpload(upload.id)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          upload.status === "success"
                            ? "bg-green-600"
                            : upload.status === "error"
                              ? "bg-red-600"
                              : "bg-blue-600"
                        }`}
                        style={{ width: `${upload.progress}%` }}
                      ></div>
                    </div>
                    {upload.message && (
                      <p
                        className={`text-xs ${
                          upload.status === "success"
                            ? "text-green-600"
                            : upload.status === "error"
                              ? "text-red-600"
                              : "text-blue-600"
                        }`}
                      >
                        {upload.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Results */}
        {uploadResults.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Upload Results ({uploadResults.length} files)</span>
                <div className="flex items-center gap-2">
                  <Badge variant="default">
                    {uploadResults.filter((r) => r.success).length} successful
                  </Badge>
                  {uploadResults.filter((r) => !r.success).length > 0 && (
                    <Badge variant="destructive">
                      {uploadResults.filter((r) => !r.success).length} failed
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {uploadResults.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                      result.success
                        ? "bg-green-50 border border-green-200"
                        : "bg-red-50 border border-red-200"
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {result.success ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium ${result.success ? "text-green-800" : "text-red-800"}`}
                      >
                        {result.fileName}
                      </p>
                      <p
                        className={`text-sm ${result.success ? "text-green-600" : "text-red-600"}`}
                      >
                        {result.success
                          ? `Successfully uploaded as ${result.type.replace("_", " ")}`
                          : `Failed: ${result.error}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={result.success ? "default" : "destructive"}
                      >
                        {result.type.replace("_", " ")}
                      </Badge>
                      {result.success && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            window.open("/company-assets", "_blank")
                          }
                          className="text-xs"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Upload Guidelines</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-3">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Company Logos
                </h4>
                <ul className="space-y-1 text-sm">
                  <li>• High-resolution PNG or SVG preferred</li>
                  <li>• Transparent background recommended</li>
                  <li>• Minimum 300x300 pixels</li>
                  <li>• Used in documents, forms, and branding</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Ticket Templates
                </h4>
                <ul className="space-y-1 text-sm">
                  <li>• Blank ticket forms for analysis</li>
                  <li>• PDF or high-quality image formats</li>
                  <li>• Helps generate digital forms</li>
                  <li>• Reference for field identification</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
