"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { 
  FileText, 
  Edit, 
  Eye, 
  Download, 
  Plus, 
  Search,
  Calendar,
  Building,
  Truck,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

interface TemplateAsset {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  asset_type: 'logo' | 'ticket_template';
  description?: string;
  file_url: string;
  created_at: string;
  updated_at: string;
}

interface TicketTemplate {
  id: string;
  name: string;
  description: string;
  partner_name?: string;
  template_fields: TemplateField[];
  base_image_url?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

interface TemplateField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select';
  label: string;
  required: boolean;
  x_position: number;
  y_position: number;
  width: number;
  height: number;
  options?: string[]; // for select fields
  default_value?: string;
}

export default function TicketTemplatesPage() {
  const [uploadedAssets, setUploadedAssets] = useState<TemplateAsset[]>([]);
  const [ticketTemplates, setTicketTemplates] = useState<TicketTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<TemplateAsset | null>(null);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);

  useEffect(() => {
    loadAssets();
    loadTemplates();
  }, []);

  const loadAssets = async () => {
    try {
      const response = await fetch('/api/company-assets');
      if (response.ok) {
        const data = await response.json();
        // Filter for ticket templates only
        const ticketAssets = data.assets?.filter(
          (asset: TemplateAsset) => asset.asset_type === 'ticket_template'
        ) || [];
        setUploadedAssets(ticketAssets);
      }
    } catch (error) {
      console.error('Error loading assets:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      // In a real implementation, this would call an API endpoint
      // For now, we'll simulate with localStorage or create the API
      const response = await fetch('/api/ticket-templates');
      if (response.ok) {
        const data = await response.json();
        setTicketTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      // Initialize empty if API doesn't exist yet
      setTicketTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplateFromAsset = (asset: TemplateAsset) => {
    setSelectedAsset(asset);
    setShowCreateTemplate(true);
  };

  const handleEditTemplate = (template: TicketTemplate) => {
    // Navigate to template editor
    window.location.href = `/ticket-templates/edit/${template.id}`;
  };

  const handleUseTemplate = (template: TicketTemplate) => {
    // Navigate to ticket form builder
    window.location.href = `/ticket-templates/fill/${template.id}`;
  };

  const filteredAssets = uploadedAssets.filter(asset => 
    asset.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTemplates = ticketTemplates.filter(template => 
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.partner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-600" />
          Ticket Template Manager
        </h1>
        <p className="text-gray-600">
          Create digital forms from uploaded ticket templates and manage your ticket generation workflow.
        </p>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search templates, assets, or partners..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => window.location.href = '/upload-assets'}>
              <Plus className="w-4 h-4 mr-2" />
              Upload Assets
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900">{uploadedAssets.length}</p>
                <p className="text-sm text-blue-700">Uploaded Templates</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900">{ticketTemplates.filter(t => t.is_active).length}</p>
                <p className="text-sm text-green-700">Active Templates</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-900">
                  {new Set(ticketTemplates.map(t => t.partner_name).filter(Boolean)).size}
                </p>
                <p className="text-sm text-purple-700">Partner Templates</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Uploaded Template Assets */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Template Assets ({filteredAssets.length})
          </h2>
          
          {filteredAssets.length === 0 ? (
            <Card className="border-dashed border-2 border-gray-300">
              <CardContent className="pt-6 text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">No Template Assets</h3>
                <p className="text-gray-500 mb-4">
                  Upload ticket template images to create digital forms
                </p>
                <Button onClick={() => window.location.href = '/upload-assets'}>
                  <Plus className="w-4 h-4 mr-2" />
                  Upload First Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredAssets.map((asset) => (
                <Card key={asset.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      {/* Preview */}
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                        {asset.file_type.startsWith('image/') ? (
                          <img 
                            src={asset.file_url} 
                            alt={asset.file_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileText className="w-6 h-6 text-gray-400" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">{asset.file_name}</h3>
                        {asset.description && (
                          <p className="text-sm text-gray-600 mb-2">{asset.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{(asset.file_size / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span>{new Date(asset.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleCreateTemplateFromAsset(asset)}
                          className="text-xs"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Create Form
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => window.open(asset.file_url, '_blank')}
                          className="text-xs"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Digital Templates */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Digital Templates ({filteredTemplates.length})
          </h2>
          
          {filteredTemplates.length === 0 ? (
            <Card className="border-dashed border-2 border-gray-300">
              <CardContent className="pt-6 text-center py-12">
                <Edit className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">No Digital Templates</h3>
                <p className="text-gray-500 mb-4">
                  Create digital forms from your uploaded template assets
                </p>
                {uploadedAssets.length > 0 ? (
                  <p className="text-sm text-blue-600">
                    ← Click "Create Form" on any template asset to get started
                  </p>
                ) : (
                  <Button onClick={() => window.location.href = '/upload-assets'}>
                    <Plus className="w-4 h-4 mr-2" />
                    Upload Templates First
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-gray-900">{template.name}</h3>
                          <Badge variant={template.is_active ? "default" : "secondary"}>
                            {template.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        
                        {template.partner_name && (
                          <p className="text-sm text-blue-600 mb-1 flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            {template.partner_name}
                          </p>
                        )}
                        
                        <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                        
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{template.template_fields.length} fields</span>
                          <span>•</span>
                          <span>{new Date(template.updated_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <Button 
                          size="sm" 
                          onClick={() => handleUseTemplate(template)}
                          className="text-xs"
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          Fill Form
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditTemplate(template)}
                          className="text-xs"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info Section */}
      <Card className="mt-8 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">How Ticket Templates Work</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                <div>
                  <h4 className="font-medium mb-2">1. Upload Template Assets</h4>
                  <ul className="space-y-1 list-disc list-inside text-xs">
                    <li>Upload blank ticket forms from partners</li>
                    <li>High-quality images or PDFs work best</li>
                    <li>Templates help identify field locations</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">2. Create Digital Forms</h4>
                  <ul className="space-y-1 list-disc list-inside text-xs">
                    <li>Map form fields to template positions</li>
                    <li>Set field types, labels, and validation</li>
                    <li>Configure partner-specific rules</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">3. Fill & Generate</h4>
                  <ul className="space-y-1 list-disc list-inside text-xs">
                    <li>Use digital forms for data entry</li>
                    <li>Generate PDF tickets automatically</li>
                    <li>Export for printing or digital delivery</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">4. Workflow Integration</h4>
                  <ul className="space-y-1 list-disc list-inside text-xs">
                    <li>Integrate with existing OCR system</li>
                    <li>Maintain ticket review process</li>
                    <li>Support driver upload workflows</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
