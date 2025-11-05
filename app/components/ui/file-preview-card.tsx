"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  X, 
  FileText, 
  Image as ImageIcon, 
  Building, 
  Truck, 
  Eye,
  Download,
  Info
} from "lucide-react";

interface FilePreviewData {
  file: File;
  preview?: string;
  type: 'company_logo' | 'ticket_template';
  description: string;
  id: string;
}

interface FilePreviewCardProps {
  fileData: FilePreviewData;
  onRemove: (id: string) => void;
  onTypeChange: (id: string, type: 'company_logo' | 'ticket_template') => void;
  onDescriptionChange: (id: string, description: string) => void;
  uploading?: boolean;
}

export default function FilePreviewCard({
  fileData,
  onRemove,
  onTypeChange,
  onDescriptionChange,
  uploading = false
}: FilePreviewCardProps) {
  const [showFullPreview, setShowFullPreview] = useState(false);
  const { file, preview, type, description, id } = fileData;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = () => {
    if (file.type.startsWith('image/')) return ImageIcon;
    if (file.type === 'application/pdf') return FileText;
    return FileText;
  };

  const FileIcon = getFileIcon();

  return (
    <>
      <Card className={`transition-all duration-200 ${uploading ? 'opacity-60' : 'hover:shadow-md'}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* File Preview/Icon */}
            <div className="flex-shrink-0 relative">
              {preview ? (
                <div className="relative">
                  <img
                    src={preview}
                    alt="File preview"
                    className="w-20 h-20 object-cover rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setShowFullPreview(true)}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full shadow-sm"
                    onClick={() => setShowFullPreview(true)}
                  >
                    <Eye className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border flex items-center justify-center">
                  <FileIcon className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>

            {/* File Information */}
            <div className="flex-1 min-w-0 space-y-3">
              {/* File Name & Size */}
              <div>
                <h4 className="font-medium text-gray-800 truncate pr-8" title={file.name}>
                  {file.name}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {file.type.split('/')[1].toUpperCase()}
                  </Badge>
                  <span className="text-sm text-gray-500">{formatFileSize(file.size)}</span>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Info className="w-3 h-3" />
                    <span>{new Date(file.lastModified).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Type Selection */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={type === 'company_logo' ? 'default' : 'outline'}
                  onClick={() => onTypeChange(id, 'company_logo')}
                  className="text-xs h-8"
                  disabled={uploading}
                >
                  <Building className="w-3 h-3 mr-1" />
                  Company Logo
                </Button>
                <Button
                  size="sm"
                  variant={type === 'ticket_template' ? 'default' : 'outline'}
                  onClick={() => onTypeChange(id, 'ticket_template')}
                  className="text-xs h-8"
                  disabled={uploading}
                >
                  <Truck className="w-3 h-3 mr-1" />
                  Ticket Template
                </Button>
              </div>

              {/* Description Input */}
              <Input
                placeholder={`Add description for this ${type.replace('_', ' ')}...`}
                value={description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onDescriptionChange(id, e.target.value)}
                className="text-sm"
                disabled={uploading}
              />

              {/* File Actions */}
              <div className="flex items-center gap-2 pt-1">
                {preview && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowFullPreview(true)}
                    className="text-xs h-7 px-2"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Preview
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const url = URL.createObjectURL(file);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = file.name;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="text-xs h-7 px-2"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </Button>
              </div>
            </div>

            {/* Remove Button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onRemove(id)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 w-8 h-8 p-0 rounded-full flex-shrink-0"
              disabled={uploading}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Upload Progress Indicator */}
          {uploading && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Uploading...</span>
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-blue-600 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full Preview Modal */}
      {showFullPreview && preview && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setShowFullPreview(false)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={preview}
              alt="Full preview"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-4 right-4 w-8 h-8 p-0 rounded-full"
              onClick={() => setShowFullPreview(false)}
            >
              <X className="w-4 h-4" />
            </Button>
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-md text-sm">
              {file.name}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export { type FilePreviewData };