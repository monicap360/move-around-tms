"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Image,
  Download,
  ExternalLink,
  Eye,
  File,
  Receipt,
  Package,
  Truck,
} from "lucide-react";

interface Document {
  id: string;
  type: "BOL" | "POD" | "Scale Ticket" | "Invoice" | "Other";
  url: string;
  name?: string;
  uploaded_at?: string;
  thumbnail_url?: string;
}

interface RelatedDocumentsPreviewProps {
  ticketId: string;
  ticketNumber?: string;
}

export default function RelatedDocumentsPreview({
  ticketId,
  ticketNumber,
}: RelatedDocumentsPreviewProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, [ticketId]);

  async function loadDocuments() {
    try {
      setLoading(true);
      const res = await fetch(`/api/tickets/${ticketId}/documents`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error("Error loading documents:", err);
    } finally {
      setLoading(false);
    }
  }

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case "BOL":
        return <FileText className="w-5 h-5" />;
      case "POD":
        return <Package className="w-5 h-5" />;
      case "Scale Ticket":
        return <Receipt className="w-5 h-5" />;
      case "Invoice":
        return <Truck className="w-5 h-5" />;
      default:
        return <File className="w-5 h-5" />;
    }
  };

  const getDocumentColor = (type: string) => {
    switch (type) {
      case "BOL":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "POD":
        return "bg-green-100 text-green-700 border-green-300";
      case "Scale Ticket":
        return "bg-purple-100 text-purple-700 border-purple-300";
      case "Invoice":
        return "bg-orange-100 text-orange-700 border-orange-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const isImage = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  const handleDownload = (url: string, name: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = name || "document";
    link.target = "_blank";
    link.click();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">Loading documents...</div>
        </CardContent>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Related Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No documents attached to this ticket</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Related Documents ({documents.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Thumbnail */}
              <div className="mb-3">
                {doc.thumbnail_url || isImage(doc.url) ? (
                  <div className="relative aspect-video bg-gray-100 rounded overflow-hidden">
                    <img
                      src={doc.thumbnail_url || doc.url}
                      alt={doc.name || doc.type}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to icon if image fails to load
                        (e.target as HTMLImageElement).style.display = "none";
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="w-full h-full flex items-center justify-center">
                              ${getDocumentIcon(doc.type).props.children ? `<div class="text-gray-400">${getDocumentIcon(doc.type)}</div>` : ""}
                            </div>
                          `;
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-100 rounded flex items-center justify-center">
                    <div className="text-gray-400">
                      {getDocumentIcon(doc.type)}
                    </div>
                  </div>
                )}
              </div>

              {/* Document Info */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`px-2 py-1 rounded text-xs font-medium border ${getDocumentColor(doc.type)}`}
                  >
                    {doc.type}
                  </div>
                </div>
                <p className="text-sm font-medium truncate">
                  {doc.name || `${doc.type} Document`}
                </p>
                {doc.uploaded_at && (
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(doc.uploaded_at).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => window.open(doc.url, "_blank")}
                >
                  <Eye className="w-4 h-4" />
                  View
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => handleDownload(doc.url, doc.name || doc.type)}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
