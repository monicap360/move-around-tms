"use client";
import { useState, useEffect } from "react";
import { Progress } from "./progress";
import { CheckCircle, AlertCircle, Upload, X } from "lucide-react";

interface UploadProgressProps {
  isUploading: boolean;
  progress: number;
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  fileName?: string;
  message?: string;
  onCancel?: () => void;
  showDetails?: boolean;
}

export default function UploadProgress({
  isUploading,
  progress,
  status,
  fileName,
  message,
  onCancel,
  showDetails = true
}: UploadProgressProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    if (isUploading) {
      const timer = setTimeout(() => {
        setAnimatedProgress(progress);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setAnimatedProgress(0);
    }
  }, [progress, isUploading]);

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'uploading':
      case 'processing':
        return (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600">
          </div>
        );
      default:
        return <Upload className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-800 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-800 bg-red-50 border-red-200';
      case 'uploading':
      case 'processing':
        return 'text-blue-800 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-800 bg-gray-50 border-gray-200';
    }
  };

  const getStatusMessage = () => {
    if (message) return message;
    
    switch (status) {
      case 'uploading':
        return `Uploading ${fileName || 'file'}... ${progress}%`;
      case 'processing':
        return `Processing ${fileName || 'file'}...`;
      case 'success':
        return `${fileName || 'File'} uploaded successfully!`;
      case 'error':
        return `Failed to upload ${fileName || 'file'}`;
      default:
        return 'Ready to upload';
    }
  };

  const getProgressColor = () => {
    switch (status) {
      case 'success':
        return 'bg-green-600';
      case 'error':
        return 'bg-red-600';
      default:
        return 'bg-blue-600';
    }
  };

  if (!isUploading && status === 'idle') {
    return null;
  }

  return (
    <div className={`rounded-lg border p-4 transition-all duration-300 ${getStatusColor()}`}>
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          {getStatusIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <p className="font-medium text-sm truncate">
              {getStatusMessage()}
            </p>
            
            {onCancel && (isUploading || status === 'processing') && (
              <button
                onClick={onCancel}
                className="ml-2 p-1 rounded-full hover:bg-gray-200 transition-colors"
                title="Cancel upload"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {(isUploading || status === 'processing') && (
            <div className="space-y-2">
              <Progress 
                value={animatedProgress} 
                className="h-2"
              />
              
              {showDetails && (
                <div className="flex justify-between text-xs text-gray-600">
                  <span>
                    {status === 'processing' ? 'Processing...' : `${Math.round(animatedProgress)}% complete`}
                  </span>
                  <span>
                    {fileName && `${fileName}`}
                  </span>
                </div>
              )}
            </div>
          )}

          {status === 'success' && showDetails && (
            <div className="mt-2">
              <div className="flex items-center gap-2 text-xs text-green-700">
                <CheckCircle className="w-3 h-3" />
                <span>Upload completed successfully</span>
              </div>
            </div>
          )}

          {status === 'error' && showDetails && (
            <div className="mt-2">
              <div className="flex items-center gap-2 text-xs text-red-700">
                <AlertCircle className="w-3 h-3" />
                <span>Upload failed - please try again</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Multi-file upload progress component
interface MultiUploadProgressProps {
  uploads: Array<{
    id: string;
    fileName: string;
    progress: number;
    status: 'uploading' | 'processing' | 'success' | 'error';
    message?: string;
  }>;
  onCancelAll?: () => void;
  onCancelSingle?: (id: string) => void;
}

export function MultiUploadProgress({ 
  uploads, 
  onCancelAll, 
  onCancelSingle 
}: MultiUploadProgressProps) {
  const totalProgress = uploads.length > 0 
    ? uploads.reduce((sum, upload) => sum + upload.progress, 0) / uploads.length 
    : 0;

  const completedCount = uploads.filter(u => u.status === 'success').length;
  const failedCount = uploads.filter(u => u.status === 'error').length;
  const activeCount = uploads.filter(u => u.status === 'uploading' || u.status === 'processing').length;

  if (uploads.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <div className="bg-white rounded-lg border p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">Upload Progress</h3>
          {onCancelAll && activeCount > 0 && (
            <button
              onClick={onCancelAll}
              className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              Cancel All
            </button>
          )}
        </div>

        <div className="space-y-2">
          <Progress value={totalProgress} className="h-3" />
          <div className="flex justify-between text-sm text-gray-600">
            <span>{Math.round(totalProgress)}% complete</span>
            <span>
              {completedCount} completed, {failedCount} failed, {activeCount} uploading
            </span>
          </div>
        </div>
      </div>

      {/* Individual File Progress */}
      <div className="space-y-2">
        {uploads.map((upload) => (
          <UploadProgress
            key={upload.id}
            isUploading={upload.status === 'uploading' || upload.status === 'processing'}
            progress={upload.progress}
            status={upload.status}
            fileName={upload.fileName}
            message={upload.message}
            onCancel={onCancelSingle ? () => onCancelSingle(upload.id) : undefined}
            showDetails={false}
          />
        ))}
      </div>
    </div>
  );
}

export { type UploadProgressProps, type MultiUploadProgressProps };