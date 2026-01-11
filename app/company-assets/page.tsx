"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import {
  Building,
  FileText,
  Image as ImageIcon,
  Truck,
  Download,
  Eye,
  Edit,
  Archive,
  Search,
} from "lucide-react";

interface CompanyAsset {
  id: number;
  asset_type: string;
  file_path: string;
  original_filename: string;
  description: string;
  file_size: number;
  mime_type: string;
  is_active: boolean;
  version: number;
  tags: string[];
  uploaded_at: string;
  metadata: any;
}

export default function CompanyAssetsPage() {
  const [assets, setAssets] = useState<CompanyAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("all");

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const response = await fetch("/api/company-assets");
      if (response.ok) {
        const data = await response.json();
        setAssets(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch assets:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAssetIcon = (assetType: string) => {
    switch (assetType) {
      case "company_logo":
        return Building;
      case "ticket_template":
        return Truck;
      case "form_template":
        return FileText;
      default:
        return ImageIcon;
    }
  };

  const getAssetColor = (assetType: string) => {
    switch (assetType) {
      case "company_logo":
        return "bg-blue-100 text-blue-800";
      case "ticket_template":
        return "bg-green-100 text-green-800";
      case "form_template":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesFilter =
      !filter ||
      asset.original_filename.toLowerCase().includes(filter.toLowerCase()) ||
      asset.description.toLowerCase().includes(filter.toLowerCase()) ||
      asset.tags.some((tag) =>
        tag.toLowerCase().includes(filter.toLowerCase()),
      );

    const matchesType =
      selectedType === "all" || asset.asset_type === selectedType;

    return matchesFilter && matchesType;
  });

  const assetTypes = [
    { value: "all", label: "All Assets" },
    { value: "company_logo", label: "Company Logos" },
    { value: "ticket_template", label: "Ticket Templates" },
    { value: "form_template", label: "Form Templates" },
  ];

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-blue-700 mb-2">
            Ronyx Logistics LLC
          </h1>
          <p className="text-gray-600 mb-4">
            3741 Graves Ave, Groves, Texas 77619
          </p>
          <h2 className="text-2xl font-semibold text-gray-800">
            Company Assets Management
          </h2>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search assets by name, description, or tags..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                {assetTypes.map((type) => (
                  <Button
                    key={type.value}
                    variant={
                      selectedType === type.value ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setSelectedType(type.value)}
                  >
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assets Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading assets...</p>
          </div>
        ) : filteredAssets.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Assets Found
              </h3>
              <p className="text-gray-600">
                Upload some company assets to get started.
              </p>
              <Button
                className="mt-4"
                onClick={() => (window.location.href = "/hr/upload")}
              >
                Upload Assets
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssets.map((asset) => {
              const IconComponent = getAssetIcon(asset.asset_type);
              return (
                <Card
                  key={asset.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${getAssetColor(asset.asset_type)}`}
                        >
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {asset.original_filename}
                          </CardTitle>
                          <Badge variant="secondary" className="mt-1">
                            v{asset.version}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {asset.description}
                    </p>

                    <div className="space-y-2 text-xs text-gray-500 mb-4">
                      <div className="flex justify-between">
                        <span>Size:</span>
                        <span>{formatFileSize(asset.file_size)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Type:</span>
                        <span>{asset.mime_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Uploaded:</span>
                        <span>
                          {new Date(asset.uploaded_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {asset.tags && asset.tags.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-1">
                          {asset.tags.map((tag, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Quick Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => (window.location.href = "/hr/upload")}>
                <Building className="w-4 h-4 mr-2" />
                Upload Logo
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/hr/upload")}
              >
                <Truck className="w-4 h-4 mr-2" />
                Upload Ticket Template
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/hr/upload")}
              >
                <FileText className="w-4 h-4 mr-2" />
                Upload Form Template
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
