"use client";
import { useEffect, useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// Using custom Alert component since @/components/ui/alert doesn't exist
const Alert = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`border rounded p-4 ${className}`}>{children}</div>
);
const AlertDescription = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={className}>{children}</div>
);

interface FileItem {
  id: string;
  name: string;
  fileName: string;
  user_folder: string;
  created_at: string;
  updated_at?: string;
  size: number;
  sizeFormatted: string;
  type: string;
  extension: string;
  isImage: boolean;
  isDocument: boolean;
}

interface User {
  id: string;
  email: string;
}

export default function FileManagerPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingShared, setUploadingShared] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sharedFileInputRef = useRef<HTMLInputElement>(null);

  // Admin status from database
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Separate personal and shared files
  const personalFiles = files.filter(file => !file.name.startsWith('shared/'));
  const sharedFiles = files.filter(file => file.name.startsWith('shared/'));

  // Load files and check admin status on component mount
  useEffect(() => {
    loadFiles();
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const res = await fetch("/api/admin/check");
      const data = await res.json();
      
      if (res.ok) {
        setIsAdmin(data.isAdmin || false);
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
      setIsAdmin(false);
    }
  };

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch("/api/storage/list");
      const json = await res.json();
      
      if (!res.ok) throw new Error(json.error || 'Failed to load files');
      
      setFiles(json.files || []);
      setUser(json.user);
    } catch (err: any) {
      setError(err.message);
      console.error('Error loading files:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    try {
      setUploading(true);
      setUploadProgress(0);
      setError(null);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('folder', user?.id || '');

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const res = await fetch("/api/storage/upload", {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const json = await res.json();
      
      if (!res.ok) throw new Error(json.error || 'Upload failed');

      // Reload files to show the new upload
      await loadFiles();
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (err: any) {
      setError(err.message);
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSharedFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!isAdmin) {
      setError('Only admins can upload to shared folder');
      return;
    }

    try {
      setUploadingShared(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch("/api/storage/shared-upload", {
        method: 'POST',
        body: formData
      });

      const json = await res.json();
      
      if (!res.ok) throw new Error(json.error || 'Shared upload failed');

      // Reload files to show the new upload
      await loadFiles();
      
      // Reset file input
      if (sharedFileInputRef.current) {
        sharedFileInputRef.current.value = '';
      }

    } catch (err: any) {
      setError(err.message);
      console.error('Shared upload error:', err);
    } finally {
      setUploadingShared(false);
    }
  };

  const handleFileDownload = async (file: FileItem) => {
    try {
      const res = await fetch("/api/storage/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: file.name }),
      });

      const json = await res.json();
      
      if (!res.ok) throw new Error(json.error || 'Failed to get download link');

      // Open in new tab for viewing/downloading
      window.open(json.signedUrl, "_blank");
      
    } catch (err: any) {
      setError(`Download failed: ${err.message}`);
      console.error('Download error:', err);
    }
  };

  const handleFileDelete = async (file: FileItem) => {
    const isSharedFile = file.name.startsWith('shared/');
    
    if (!confirm(`Are you sure you want to delete "${file.fileName}"?`)) {
      return;
    }

    // Check admin permission for shared files
    if (isSharedFile && !isAdmin) {
      setError('Only admins can delete shared files');
      return;
    }

    try {
      setError(null);
      
      const endpoint = isSharedFile ? "/api/storage/shared-delete" : "/api/storage/delete";
      const method = isSharedFile ? "POST" : "DELETE";
      
      const res = await fetch(endpoint, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: file.name }),
      });

      const json = await res.json();
      
      if (!res.ok) throw new Error(json.error || 'Delete failed');

      // Remove from local state immediately for better UX
      setFiles(prev => prev.filter(f => f.id !== file.id));
      
    } catch (err: any) {
      setError(`Delete failed: ${err.message}`);
      console.error('Delete error:', err);
    }
  };

  const getFileIcon = (file: FileItem) => {
    if (file.isImage) return '🖼️';
    if (file.extension === 'pdf') return '📄';
    if (['doc', 'docx'].includes(file.extension)) return '📝';
    if (['xls', 'xlsx'].includes(file.extension)) return '📊';
    if (['ppt', 'pptx'].includes(file.extension)) return '📽️';
    return '📎';
  };

  const getFileTypeColor = (file: FileItem) => {
    if (file.isImage) return 'bg-green-100 text-green-800';
    if (file.extension === 'pdf') return 'bg-red-100 text-red-800';
    if (file.isDocument) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  const groupFilesByFolder = (files: FileItem[]) => {
    const grouped = files.reduce((acc, file) => {
      const folder = file.user_folder;
      if (!acc[folder]) acc[folder] = [];
      acc[folder].push(file);
      return acc;
    }, {} as Record<string, FileItem[]>);

    return grouped;
  };

  const groupedFiles = groupFilesByFolder(files);

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading files...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>File Manager</span>
            <Badge variant="outline">{files.length} files</Badge>
          </CardTitle>
          {user && (
            <p className="text-sm text-gray-600">
              Logged in as: {user.email}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Upload Section */}
          {/* Personal File Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              disabled={uploading}
              accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
              className="hidden"
              id="file-upload"
            />
            <label 
              htmlFor="file-upload" 
              className={`cursor-pointer ${uploading ? 'opacity-50' : ''}`}
            >
              <div className="mb-2 text-4xl">📁</div>
              <div className="font-semibold mb-1">
                {uploading ? 'Uploading Personal Files...' : 'Upload Personal Files'}
              </div>
              <div className="text-sm text-gray-500">
                Your private files - Supports: Images, PDFs, Documents (Max 50MB)
              </div>
            </label>
            
            {uploading && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-1">{uploadProgress}%</p>
              </div>
            )}
          </div>

          {/* Shared File Upload - Admin Only */}
          {isAdmin && (
            <div className="border-2 border-dashed border-green-300 rounded-lg p-6 text-center bg-green-50">
              <input
                ref={sharedFileInputRef}
                type="file"
                onChange={handleSharedFileUpload}
                disabled={uploadingShared}
                accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
                className="hidden"
                id="shared-file-upload"
              />
              <label 
                htmlFor="shared-file-upload" 
                className={`cursor-pointer ${uploadingShared ? 'opacity-50' : ''}`}
              >
                <div className="mb-2 text-4xl">🌐</div>
                <div className="font-semibold mb-1 text-green-800">
                  {uploadingShared ? 'Uploading Shared Files...' : '👑 Upload Shared Files (Admin Only)'}
                </div>
                <div className="text-sm text-green-700">
                  Shared with all users - Supports: Images, PDFs, Documents (Max 50MB)
                </div>
              </label>
              
              {uploadingShared && (
                <div className="mt-4">
                  <div className="w-full bg-green-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: '100%' }}
                    ></div>
                  </div>
                  <p className="text-sm text-green-700 mt-1">Uploading...</p>
                </div>
              )}
            </div>
          )}

          <Button onClick={loadFiles} variant="outline" className="w-full">
            🔄 Refresh Files
          </Button>
        </CardContent>
      </Card>

      {files.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            <div className="text-4xl mb-4">📂</div>
            <p>No files found. Upload your first file above!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Personal Files Section */}
          {personalFiles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span>📁</span>
                  <span>My Personal Files</span>
                  <Badge variant="outline">{personalFiles.length} files</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {personalFiles.map((file) => (
                    <Card key={file.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{getFileIcon(file)}</span>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-sm truncate" title={file.fileName}>
                                {file.fileName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {file.sizeFormatted}
                              </div>
                            </div>
                          </div>
                          <Badge className={getFileTypeColor(file)} variant="outline">
                            {file.extension.toUpperCase()}
                          </Badge>
                        </div>

                        <div className="text-xs text-gray-500 mb-3">
                          {new Date(file.created_at).toLocaleString()}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleFileDownload(file)}
                            className="flex-1"
                          >
                            👁️ View
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleFileDelete(file)}
                          >
                            🗑️
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Shared Files Section */}
          {sharedFiles.length > 0 && (
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span>🌐</span>
                  <span>Shared Files (All Users)</span>
                  <Badge variant="outline" className="bg-green-100">{sharedFiles.length} files</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sharedFiles.map((file) => (
                    <Card key={file.id} className="border-l-4 border-l-green-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{getFileIcon(file)}</span>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-sm truncate" title={file.fileName}>
                                {file.fileName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {file.sizeFormatted}
                              </div>
                            </div>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${file.isImage ? 'bg-purple-100' : file.isDocument ? 'bg-blue-100' : 'bg-gray-100'}`}
                          >
                            {file.extension}
                          </Badge>
                        </div>
                        
                        <div className="text-xs text-gray-500 mb-3">
                          📅 {new Date(file.created_at).toLocaleDateString()}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleFileDownload(file)}
                          >
                            👁️ View
                          </Button>
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleFileDelete(file)}
                            >
                              🗑️
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}