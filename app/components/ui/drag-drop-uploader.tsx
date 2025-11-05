"use client";
import { useCallback, useState } from "react";
import { Upload as UploadIcon, FileText, Image as ImageIcon, X } from "lucide-react";
import { safeAlert } from "@/lib/utils/alert";

interface FileWithPreview extends File {
  preview?: string;
  id: string;
}

interface DragDropUploaderProps {
  onFilesAdded: (files: FileWithPreview[]) => void;
  acceptedTypes?: string;
  maxFileSize?: number; // in MB
  maxFiles?: number;
  className?: string;
  children?: React.ReactNode;
}

export default function DragDropUploader({
  onFilesAdded,
  acceptedTypes = "image/*,application/pdf",
  maxFileSize = 10,
  maxFiles = 10,
  className = "",
  children
}: DragDropUploaderProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      safeAlert(`File ${file.name} is too large. Maximum size is ${maxFileSize}MB.`);
      return false;
    }

    // Check file type
    const accepted = acceptedTypes.split(',').map(type => type.trim());
    const isValidType = accepted.some(type => {
      if (type === 'image/*') return file.type.startsWith('image/');
      if (type === 'application/pdf') return file.type === 'application/pdf';
      return file.type === type;
    });

    if (!isValidType) {
      safeAlert(`File ${file.name} is not a supported format.`);
      return false;
    }

    return true;
  };

  const processFiles = (fileList: FileList | File[]): FileWithPreview[] => {
    const files = Array.from(fileList);
    const validFiles = files.filter(validateFile);
    
    if (validFiles.length > maxFiles) {
      safeAlert(`You can only upload up to ${maxFiles} files at once.`);
      validFiles.splice(maxFiles);
    }

    return validFiles.map(file => {
      const fileWithPreview: FileWithPreview = Object.assign(file, {
        id: Math.random().toString(36).substr(2, 9),
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      });
      return fileWithPreview;
    });
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    setIsDragActive(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragActive(false);
      }
      return newCounter;
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    setDragCounter(0);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const processedFiles = processFiles(files);
      onFilesAdded(processedFiles);
    }
  }, [onFilesAdded, maxFileSize, maxFiles, acceptedTypes]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const processedFiles = processFiles(files);
      onFilesAdded(processedFiles);
    }
    // Reset input to allow selecting the same file again
    e.target.value = '';
  };

  if (children) {
    return (
      <div
        className={`${className} ${isDragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {children}
        <input
          type="file"
          multiple
          accept={acceptedTypes}
          onChange={handleFileInput}
          className="hidden"
          id="file-input"
        />
      </div>
    );
  }

  return (
    <div
      className={`
        relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer
        ${isDragActive 
          ? 'border-blue-500 bg-blue-50 scale-105 shadow-lg' 
          : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }
        ${className}
      `}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <div className="space-y-4">
        <div className="flex justify-center">
          <div className={`
            p-4 rounded-full transition-colors duration-200
            ${isDragActive ? 'bg-blue-100' : 'bg-gray-100'}
          `}>
            <UploadIcon className={`
              w-12 h-12 transition-colors duration-200
              ${isDragActive ? 'text-blue-600' : 'text-gray-400'}
            `} />
          </div>
        </div>
        
        <div>
          <h3 className={`
            text-xl font-semibold mb-2 transition-colors duration-200
            ${isDragActive ? 'text-blue-800' : 'text-gray-800'}
          `}>
            {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
          </h3>
          <p className="text-gray-600 mb-4">
            or click to select files
          </p>
        </div>

        <div className="text-sm text-gray-500">
          <p>Supports: {acceptedTypes.replace(/\*/g, '').replace(/application\//g, '').toUpperCase()}</p>
          <p>Maximum: {maxFiles} files, {maxFileSize}MB each</p>
        </div>
      </div>

      <input
        type="file"
        multiple
        accept={acceptedTypes}
        onChange={handleFileInput}
        className="hidden"
        id="file-input"
      />

      {/* Animated overlay when dragging */}
      {isDragActive && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-10 rounded-xl flex items-center justify-center">
          <div className="text-blue-600 font-semibold text-lg animate-pulse">
            Release to upload files
          </div>
        </div>
      )}
    </div>
  );
}

export { type FileWithPreview };