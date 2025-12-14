"use client";

import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Upload, Image, FileText } from 'lucide-react';

interface CompanyAssetUploaderProps {
  assetType: 'company_logo' | 'ticket_template';
  onUploadComplete?: (asset: any) => void;
}

const CompanyAssetUploader = ({ assetType, onUploadComplete }: CompanyAssetUploaderProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('asset_type', assetType);
      formData.append('description', description);
      formData.append('tags', tags);

      const response = await fetch('/api/company-assets/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setUploadResult({
          success: true,
          message: result.message,
          asset: result.data
        });
        
        // Reset form
        setFile(null);
        setDescription('');
        setTags('');
        
        // Call callback if provided
        if (onUploadComplete) {
          onUploadComplete(result.data);
        }
      } else {
        setUploadResult({
          success: false,
          message: result.error
        });
      }
    } catch (error) {
      setUploadResult({
        success: false,
        message: 'Upload failed. Please try again.'
      });
    } finally {
      setUploading(false);
    }
  };

  const getAcceptedTypes = () => {
    if (assetType === 'company_logo') {
      return 'image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml';
    } else {
      return 'image/*,application/pdf,text/plain,application/json';
    }
  };

  const getIcon = () => {
    return assetType === 'company_logo' ? (
      <Image className="w-6 h-6" />
    ) : (
      <FileText className="w-6 h-6" />
    );
  };

  const getTitle = () => {
    return assetType === 'company_logo' ? 'Upload Company Logo' : 'Upload Ticket Template';
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getIcon()}
          {getTitle()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Input */}
        <div>
          <input
            type="file"
            accept={getAcceptedTypes()}
            onChange={handleFileChange}
            disabled={uploading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
          {file && (
            <p className="text-sm text-gray-500 mt-1">
              Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        {/* Description Input */}
        <div>
          <Input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={uploading}
          />
        </div>

        {/* Tags Input */}
        <div>
          <Input
            type="text"
            placeholder="Tags (comma-separated, optional)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            disabled={uploading}
          />
        </div>

        {/* Upload Button */}
        <Button 
          onClick={handleUpload} 
          disabled={!file || uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Upload className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload {assetType === 'company_logo' ? 'Logo' : 'Template'}
            </>
          )}
        </Button>

        {/* Upload Result */}
        {uploadResult && (
          <div className={`p-3 rounded-md text-sm ${
            uploadResult.success 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {uploadResult.message}
            {uploadResult.success && uploadResult.asset && (
              <div className="mt-2 text-xs">
                <p><strong>File:</strong> {uploadResult.asset.original_filename}</p>
                <p><strong>Path:</strong> {uploadResult.asset.file_path}</p>
                {uploadResult.asset.public_url && (
                  <p><strong>URL:</strong> <a href={uploadResult.asset.public_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View File</a></p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

}

export default CompanyAssetUploader;
