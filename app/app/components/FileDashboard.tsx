"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import Link from "next/link";

interface FileItem {
  id: string;
  name: string;
  fileName: string;
  user_folder: string;
  created_at: string;
  sizeFormatted: string;
  type: string;
  extension: string;
  isImage: boolean;
  isDocument: boolean;
}

export default function FileDashboard() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFiles() {
      try {
        const res = await fetch("/api/storage/list");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setFiles(json.files || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadFiles();
  }, []);

  const handleFileView = async (file: FileItem) => {
    try {
      const res = await fetch("/api/storage/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: file.name }),
      });
      const { signedUrl } = await res.json();
      if (signedUrl) {
        window.open(signedUrl, "_blank");
      }
    } catch (err) {
      console.error('Error opening file:', err);
    }
  };

  const getFileIcon = (file: FileItem) => {
    if (file.isImage) return '🖼️';
    if (file.extension === 'pdf') return '📄';
    if (['doc', 'docx'].includes(file.extension)) return '📝';
    if (['xls', 'xlsx'].includes(file.extension)) return '📊';
    return '📎';
  };

  if (loading) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading files...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <p className="text-red-800">Error: {error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!files.length) {
    return (
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Your Uploaded Files
              <Link href="/file-manager">
                <Button size="sm">📁 Manage Files</Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            <div className="text-6xl mb-4">📂</div>
            <p className="text-gray-500 mb-4">No files found.</p>
            <Link href="/file-manager">
              <Button>Upload Your First File</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>Your Uploaded Files</span>
              <Badge variant="outline">{files.length} files</Badge>
            </div>
            <Link href="/file-manager">
              <Button size="sm">📁 Manage All Files</Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {files.slice(0, 10).map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 border rounded hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{getFileIcon(file)}</span>
                  <div>
                    <div className="font-medium text-sm">{file.fileName}</div>
                    <div className="text-xs text-gray-500">
                      {file.sizeFormatted} • {new Date(file.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleFileView(file)}
                >
                  👁️ View
                </Button>
              </div>
            ))}
            
            {files.length > 10 && (
              <div className="text-center pt-4 border-t">
                <Link href="/file-manager">
                  <Button variant="outline">
                    View All {files.length} Files
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
