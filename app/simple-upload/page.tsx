"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  Building, 
  Truck, 
  Check,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  X
} from "lucide-react";

interface UploadFile {
  file: File;
  preview?: string;
  type: 'company_logo' | 'ticket_template';
  id: string;
}

interface UploadResult {
  success: boolean;
  fileName: string;
  type: string;
  path?: string;
  error?: string;
}

export default function SimpleUploadPage() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    const newFiles: UploadFile[] = selectedFiles.map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      type: file.name.toLowerCase().includes('logo') ? 'company_logo' : 'ticket_template',
      id: Math.random().toString(36).substr(2, 9)
    }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const updateFileType = (id: string, type: 'company_logo' | 'ticket_template') => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, type } : f));
  };

  const uploadFile = async (uploadFile: UploadFile): Promise<UploadResult> => {
    try {
      const { file, type } = uploadFile;
      
      console.log('🔍 Starting upload for:', file.name);
      
      // Determine storage path
      const timestamp = Date.now();
      const bucket = "company_assets";
      const path = type === 'company_logo' 
        ? `logos/${timestamp}-${file.name}`
        : `templates/tickets/${timestamp}-${file.name}`;

      console.log('🔍 Upload details:', { bucket, path, fileSize: file.size });

      // Upload to Supabase Storage
      const { data: uploadRes, error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: false, cacheControl: '3600' });

      if (uploadErr) {
        console.error('❌ Storage Error:', uploadErr);
        return {
          success: false,
          fileName: file.name,
          type,
          error: uploadErr.message
        };
      }

      console.log('✅ Storage upload successful:', uploadRes);

      // Save metadata to database
      const assetPayload = {
        asset_type: type,
        file_path: uploadRes.path,
        original_filename: file.name,
        description: `${type.replace('_', ' ')} uploaded ${new Date().toLocaleDateString()}`,
        file_size: file.size,
        mime_type: file.type,
        tags: type === 'company_logo' ? ['branding', 'official'] : ['template', 'billing'],
        metadata: {
          uploaded_from: 'simple_upload_page',
          upload_session: timestamp
        }
      };

      console.log('🔍 Saving metadata:', assetPayload);

      const response = await fetch('/api/company-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', response.status, errorText);
        return {
          success: false,
          fileName: file.name,
          type,
          error: `API Error: ${response.status}`
        };
      }

      console.log('✅ Metadata saved successfully');

      return {
        success: true,
        fileName: file.name,
        type,
        path: uploadRes.path
      };
    } catch (error) {
      console.error('❌ Upload exception:', error);
      return {
        success: false,
        fileName: uploadFile.file.name,
        type: uploadFile.type,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const handleUploadAll = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setUploadResults([]);

    const results: UploadResult[] = [];
    for (const file of files) {
      const result = await uploadFile(file);
      results.push(result);
    }

    setUploadResults(results);

    // Remove successfully uploaded files
    const successfulIds = files
      .filter((_, index) => results[index].success)
      .map(f => f.id);
    
    successfulIds.forEach(id => removeFile(id));
    setUploading(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Simple Upload</h1>
          <p className="text-gray-600 text-lg">Upload logos and ticket templates</p>
        </div>

        {/* File Selection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Select Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <input
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={handleFileSelect}
                className="w-full p-3 border border-gray-300 rounded-md"
              />
              <p className="text-sm text-gray-500">
                Supports: JPG, PNG, PDF • Maximum 10MB each
              </p>
            </div>
          </CardContent>
        </Card>

        {/* File Preview */}
        {files.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Files to Upload ({files.length})</span>
                <Button onClick={handleUploadAll} disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Upload All'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {files.map((file) => (
                  <div key={file.id} className="border rounded p-4 flex items-center gap-4">
                    {/* Preview */}
                    <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                      {file.preview ? (
                        <img src={file.preview} alt="Preview" className="w-full h-full object-cover rounded" />
                      ) : (
                        <FileText className="w-6 h-6 text-gray-400" />
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1">
                      <p className="font-medium">{file.file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>

                    {/* Type Selection */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={file.type === 'company_logo' ? 'default' : 'outline'}
                        onClick={() => updateFileType(file.id, 'company_logo')}
                      >
                        <Building className="w-4 h-4 mr-1" />
                        Logo
                      </Button>
                      <Button
                        size="sm"
                        variant={file.type === 'ticket_template' ? 'default' : 'outline'}
                        onClick={() => updateFileType(file.id, 'ticket_template')}
                      >
                        <Truck className="w-4 h-4 mr-1" />
                        Template
                      </Button>
                    </div>

                    {/* Remove */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(file.id)}
                      className="text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Results */}
        {uploadResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {uploadResults.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {result.success ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                        {result.fileName}
                      </p>
                      <p className={`text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                        {result.success 
                          ? `Successfully uploaded as ${result.type.replace('_', ' ')}`
                          : `Failed: ${result.error}`
                        }
                      </p>
                    </div>
                    <Badge variant={result.success ? 'default' : 'destructive'}>
                      {result.type.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}