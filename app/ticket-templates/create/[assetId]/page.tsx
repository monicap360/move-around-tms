"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { safeAlert } from "@/lib/utils/alert";
import { 
  Save, 
  Plus, 
  Trash2, 
  Move, 
  Type, 
  Hash, 
  Calendar,
  List,
  ArrowLeft,
  Eye,
  Download,
  AlertCircle
} from "lucide-react";

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
  options?: string[];
  default_value?: string;
}

interface TemplateAsset {
  id: string;
  file_name: string;
  file_url: string;
  description?: string;
}

export default function TemplateEditorPage({ params }: { params: { assetId?: string } }) {
  const [asset, setAsset] = useState<TemplateAsset | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [selectedField, setSelectedField] = useState<TemplateField | null>(null);
  const [isCreatingField, setIsCreatingField] = useState(false);
  const [newFieldStart, setNewFieldStart] = useState<{x: number, y: number} | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const imageRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const assetId = params?.assetId;

  useEffect(() => {
    if (assetId) {
      loadAsset(assetId);
    }
  }, [assetId]);

  const loadAsset = async (id: string) => {
    try {
      const response = await fetch('/api/company-assets');
      if (response.ok) {
        const data = await response.json();
        const foundAsset = data.assets?.find((a: TemplateAsset) => a.id === id);
        if (foundAsset) {
          setAsset(foundAsset);
          setTemplateName(`${foundAsset.file_name.split('.')[0]} Template`);
          setTemplateDescription(foundAsset.description || `Digital form for ${foundAsset.file_name}`);
        }
      }
    } catch (error) {
      console.error('Error loading asset:', error);
    }
  };

  const handleImageLoad = () => {
    if (imageRef.current && overlayRef.current) {
      const img = imageRef.current;
      const container = overlayRef.current.parentElement;
      if (container) {
        const scale = Math.min(
          (container.clientWidth - 32) / img.naturalWidth,
          (container.clientHeight - 100) / img.naturalHeight,
          1
        );
        setImageScale(scale);
      }
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (!isCreatingField || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / imageScale;
    const y = (e.clientY - rect.top) / imageScale;

    if (!newFieldStart) {
      setNewFieldStart({ x, y });
    } else {
      // Create field
      const field: TemplateField = {
        id: `field_${Date.now()}`,
        name: `field_${fields.length + 1}`,
        label: `Field ${fields.length + 1}`,
        type: 'text',
        required: false,
        x_position: Math.min(newFieldStart.x, x),
        y_position: Math.min(newFieldStart.y, y),
        width: Math.abs(x - newFieldStart.x),
        height: Math.abs(y - newFieldStart.y)
      };

      setFields([...fields, field]);
      setSelectedField(field);
      setNewFieldStart(null);
      setIsCreatingField(false);
    }
  };

  const updateField = (fieldId: string, updates: Partial<TemplateField>) => {
    setFields(fields.map(f => f.id === fieldId ? { ...f, ...updates } : f));
    if (selectedField?.id === fieldId) {
      setSelectedField({ ...selectedField, ...updates });
    }
  };

  const deleteField = (fieldId: string) => {
    setFields(fields.filter(f => f.id !== fieldId));
    if (selectedField?.id === fieldId) {
      setSelectedField(null);
    }
  };

  const handleSave = async () => {
    if (!templateName.trim() || !templateDescription.trim()) {
      safeAlert('Please provide a name and description for the template');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/ticket-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          description: templateDescription,
          partner_name: partnerName || null,
          base_image_url: asset?.file_url,
          template_fields: fields.map(f => ({
            name: f.name,
            label: f.label,
            type: f.type,
            required: f.required,
            x_position: f.x_position,
            y_position: f.y_position,
            width: f.width,
            height: f.height,
            options: f.options,
            default_value: f.default_value
          }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        safeAlert('Template created successfully!');
        window.location.href = '/ticket-templates';
      } else {
        const error = await response.json();
        safeAlert(`Error: ${error.error || 'Failed to save template'}`);
      }
    } catch (error) {
      console.error('Save error:', error);
      safeAlert('Error saving template');
    } finally {
      setSaving(false);
    }
  };

  const handleTestFill = () => {
    // Store template in session storage for testing
    sessionStorage.setItem('temp_template', JSON.stringify({
      name: templateName,
      description: templateDescription,
      partner_name: partnerName,
      base_image_url: asset?.file_url,
      template_fields: fields
    }));
    window.open('/ticket-templates/test-fill', '_blank');
  };

  if (!asset) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700">Asset Not Found</h3>
            <p className="text-gray-500 mb-4">The template asset could not be loaded.</p>
            <Button onClick={() => window.location.href = '/ticket-templates'}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Templates
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => window.location.href = '/ticket-templates'}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Template Editor</h1>
              <p className="text-gray-600">{asset.file_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setPreviewMode(!previewMode)}
            >
              <Eye className="w-4 h-4 mr-2" />
              {previewMode ? 'Edit Mode' : 'Preview'}
            </Button>
            <Button
              variant="outline"
              onClick={handleTestFill}
              disabled={fields.length === 0}
            >
              <Type className="w-4 h-4 mr-2" />
              Test Fill
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Template'}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Left Panel - Template Settings & Fields */}
        <div className="w-80 bg-white border-r border-gray-200 p-6 overflow-y-auto max-h-screen">
          {/* Template Info */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 mb-4">Template Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., ABC Quarry Delivery Ticket"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <Input
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Describe this template..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Partner Name (Optional)
                </label>
                <Input
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  placeholder="e.g., ABC Stone & Gravel"
                />
              </div>
            </div>
          </div>

          {/* Field Creation */}
          {!previewMode && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-4">Add Fields</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant={isCreatingField ? "default" : "outline"}
                  onClick={() => {
                    setIsCreatingField(!isCreatingField);
                    setNewFieldStart(null);
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Draw Field
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setFields([])}
                  disabled={fields.length === 0}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear All
                </Button>
              </div>
              
              {isCreatingField && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                  {!newFieldStart ? (
                    <p>Click on the image to start drawing a field area</p>
                  ) : (
                    <p>Click again to finish the field area</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Fields List */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              Fields ({fields.length})
              {selectedField && <Badge variant="outline">Editing</Badge>}
            </h3>

            {fields.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Type className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No fields created yet</p>
                {!previewMode && (
                  <p className="text-xs mt-1">Click "Draw Field" to start</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((field) => (
                  <div
                    key={field.id}
                    className="cursor-pointer transition-colors"
                    onClick={() => setSelectedField(field)}
                  >
                    <Card 
                      className={`${
                        selectedField?.id === field.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">{field.label}</h4>
                          {!previewMode && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                deleteField(field.id);
                              }}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Badge variant="secondary" className="text-xs">
                          {field.type}
                        </Badge>
                        {field.required && <Badge variant="outline" className="text-xs">Required</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Field Properties */}
        {selectedField && !previewMode && (
          <div className="w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto max-h-screen">
            <h3 className="font-semibold text-gray-800 mb-4">Field Properties</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Field Name
                </label>
                <Input
                  value={selectedField.name}
                  onChange={(e) => updateField(selectedField.id, { name: e.target.value })}
                  placeholder="field_name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Label
                </label>
                <Input
                  value={selectedField.label}
                  onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                  placeholder="Display Label"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Field Type
                </label>
                <select
                  value={selectedField.type}
                  onChange={(e) => updateField(selectedField.id, { 
                    type: e.target.value as TemplateField['type'] 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="select">Select List</option>
                </select>
              </div>

              {selectedField.type === 'select' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Options (one per line)
                  </label>
                  <textarea
                    value={(selectedField.options || []).join('\n')}
                    onChange={(e) => updateField(selectedField.id, { 
                      options: e.target.value.split('\n').filter(opt => opt.trim()) 
                    })}
                    placeholder="Option 1&#10;Option 2&#10;Option 3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    rows={4}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Value (Optional)
                </label>
                <Input
                  value={selectedField.default_value || ''}
                  onChange={(e) => updateField(selectedField.id, { default_value: e.target.value })}
                  placeholder="Default value..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedField.required}
                  onChange={(e) => updateField(selectedField.id, { required: e.target.checked })}
                  className="rounded"
                />
                <label className="text-sm font-medium text-gray-700">
                  Required Field
                </label>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Position & Size</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>X: {Math.round(selectedField.x_position)}</div>
                  <div>Y: {Math.round(selectedField.y_position)}</div>
                  <div>W: {Math.round(selectedField.width)}</div>
                  <div>H: {Math.round(selectedField.height)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Canvas */}
        <div className="flex-1 p-6 overflow-auto">
          <Card className="mx-auto w-fit">
            <CardContent className="p-4">
              <div className="relative inline-block">
                <img
                  ref={imageRef}
                  src={asset.file_url}
                  alt={asset.file_name}
                  className="max-w-full h-auto"
                  style={{
                    transform: `scale(${imageScale})`,
                    transformOrigin: 'top left'
                  }}
                  onLoad={handleImageLoad}
                />
                
                {/* Field Overlay */}
                <div
                  ref={overlayRef}
                  className="absolute inset-0 cursor-crosshair"
                  onClick={handleOverlayClick}
                  style={{
                    transform: `scale(${imageScale})`,
                    transformOrigin: 'top left'
                  }}
                >
                  {/* Render existing fields */}
                  {fields.map((field) => (
                    <div
                      key={field.id}
                      className={`absolute border-2 bg-black bg-opacity-10 flex items-center justify-center text-xs font-medium text-white transition-colors ${
                        selectedField?.id === field.id 
                          ? 'border-blue-500 bg-blue-500 bg-opacity-30' 
                          : 'border-yellow-500 hover:border-yellow-400'
                      }`}
                      style={{
                        left: field.x_position,
                        top: field.y_position,
                        width: field.width,
                        height: field.height
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedField(field);
                      }}
                    >
                      <span className="text-shadow">{field.label}</span>
                    </div>
                  ))}

                  {/* Show current field being created */}
                  {newFieldStart && (
                    <div
                      className="absolute border-2 border-dashed border-green-500 bg-green-500 bg-opacity-20"
                      style={{
                        left: newFieldStart.x,
                        top: newFieldStart.y,
                        width: 100,
                        height: 30
                      }}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}