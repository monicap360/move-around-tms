"use client";

export const dynamic = 'force-dynamic';
import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import { 
  Save, 
  Download, 
  ArrowLeft, 
  FileText, 
  Calendar,
  Building,
  Truck,
  Hash,
  Type,
  CheckCircle2,
  AlertTriangle
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

interface TicketTemplate {
  id: string;
  name: string;
  description: string;
  partner_name?: string;
  template_fields: TemplateField[];
  base_image_url?: string;
  is_active: boolean;
}

interface FormData {
  [fieldName: string]: string | number;
}

export default function TicketFormFillPage({ params }: { params: { templateId?: string } }) {
  const [template, setTemplate] = useState<TicketTemplate | null>(null);
  const [formData, setFormData] = useState<FormData>({});
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const templateId = params?.templateId;

  useEffect(() => {
    if (templateId === 'test-fill') {
      // Load from session storage for testing
      const tempTemplate = sessionStorage.getItem('temp_template');
      if (tempTemplate) {
        const parsedTemplate = JSON.parse(tempTemplate);
        setTemplate({
          id: 'temp',
          ...parsedTemplate,
          template_fields: parsedTemplate.template_fields || []
        });
        initializeFormData(parsedTemplate.template_fields || []);
      }
      setLoading(false);
    } else if (templateId) {
      loadTemplate(templateId);
    }
  }, [templateId]);

  const loadTemplate = async (id: string) => {
    try {
      const response = await fetch(`/api/ticket-templates/${id}`);
      if (response.ok) {
        const data = await response.json();
        setTemplate(data.template);
        initializeFormData(data.template.template_fields);
      } else {
        console.error('Failed to load template');
      }
    } catch (error) {
      console.error('Error loading template:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeFormData = (fields: TemplateField[]) => {
    const initialData: FormData = {};
    fields.forEach(field => {
      if (field.default_value) {
        initialData[field.name] = field.default_value;
      } else {
        initialData[field.name] = field.type === 'number' ? 0 : '';
      }
    });
    setFormData(initialData);
  };

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    template?.template_fields.forEach(field => {
      if (field.required) {
        const value = formData[field.name];
        if (!value || (typeof value === 'string' && !value.trim())) {
          newErrors[field.name] = `${field.label} is required`;
        }
      }

      // Type-specific validation
      if (field.type === 'number' && formData[field.name]) {
        const numValue = Number(formData[field.name]);
        if (isNaN(numValue)) {
          newErrors[field.name] = `${field.label} must be a valid number`;
        }
      }

      if (field.type === 'date' && formData[field.name]) {
        const dateValue = new Date(formData[field.name] as string);
        if (isNaN(dateValue.getTime())) {
          newErrors[field.name] = `${field.label} must be a valid date`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (fieldName: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: '' }));
    }
  };

  const handleSaveTicket = async () => {
    if (!validateForm()) {
      alert('Please fix the validation errors before saving');
      return;
    }

    setSaving(true);
    try {
      // Save ticket data to database
      const response = await fetch('/api/tickets/create-from-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: template?.id,
          form_data: formData,
          partner_name: template?.partner_name
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert('Ticket saved successfully!');
        // Redirect to ticket details or list
        window.location.href = `/tickets/${data.ticket.id}`;
      } else {
        const error = await response.json();
        alert(`Error saving ticket: ${error.error}`);
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Error saving ticket');
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!validateForm()) {
      alert('Please fix the validation errors before generating PDF');
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch('/api/tickets/generate-pdf-from-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: template?.id,
          form_data: formData,
          template_name: template?.name,
          partner_name: template?.partner_name,
          base_image_url: template?.base_image_url
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ticket-${template?.name?.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const error = await response.json();
        alert(`Error generating PDF: ${error.error}`);
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Error generating PDF');
    } finally {
      setGenerating(false);
    }
  };

  const renderField = (field: TemplateField) => {
    const value = formData[field.name] || '';
    const hasError = !!errors[field.name];

    const commonProps = {
      className: `w-full ${hasError ? 'border-red-500' : ''}`,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => 
        handleFieldChange(field.name, field.type === 'number' ? Number(e.target.value) : e.target.value)
    };

    switch (field.type) {
      case 'text':
        return (
          <Input
            type="text"
            value={value as string}
            placeholder={field.label}
            {...commonProps}
          />
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={value as number}
            placeholder={field.label}
            step="any"
            {...commonProps}
          />
        );
      
      case 'date':
        return (
          <Input
            type="date"
            value={value as string}
            {...commonProps}
          />
        );
      
      case 'select':
        return (
          <select
            value={value as string}
            {...commonProps}
            className={`px-3 py-2 border rounded-md ${hasError ? 'border-red-500' : 'border-gray-300'}`}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700">Template Not Found</h3>
            <p className="text-gray-500 mb-4">The ticket template could not be loaded.</p>
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
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <FileText className="w-6 h-6" />
                {template.name}
              </h1>
              <p className="text-gray-600">{template.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleGeneratePDF}
              disabled={generating}
            >
              <Download className="w-4 h-4 mr-2" />
              {generating ? 'Generating...' : 'Generate PDF'}
            </Button>
            {templateId !== 'test-fill' && (
              <Button
                onClick={handleSaveTicket}
                disabled={saving}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Ticket'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="p-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="w-5 h-5" />
                  Ticket Information
                  {template.partner_name && (
                    <Badge variant="outline" className="ml-2">
                      <Building className="w-3 h-3 mr-1" />
                      {template.partner_name}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {template.template_fields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {renderField(field)}
                    {errors[field.name] && (
                      <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {errors[field.name]}
                      </p>
                    )}
                  </div>
                ))}

                {template.template_fields.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Type className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No fields defined for this template</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Template Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {template.base_image_url ? (
                  <div className="relative">
                    <img
                      src={template.base_image_url}
                      alt="Template"
                      className="w-full rounded-lg border"
                    />
                    
                    {/* Overlay filled fields */}
                    <div className="absolute inset-0">
                      {template.template_fields.map((field) => {
                        const value = formData[field.name];
                        if (!value) return null;

                        return (
                          <div
                            key={field.id}
                            className="absolute bg-blue-500 bg-opacity-20 border border-blue-500 flex items-center justify-center text-xs font-medium text-blue-800 px-1"
                            style={{
                              left: `${(field.x_position / 800) * 100}%`, // Normalize based on expected image width
                              top: `${(field.y_position / 1000) * 100}%`, // Normalize based on expected image height
                              width: `${(field.width / 800) * 100}%`,
                              height: `${(field.height / 1000) * 100}%`,
                              fontSize: Math.max(8, field.height * 0.4)
                            }}
                          >
                            {String(value).substring(0, 20)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                    <div className="text-center text-gray-500">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No preview image available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Form Summary */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Form Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {template.template_fields.map((field) => {
                    const value = formData[field.name];
                    const isComplete = field.required ? !!value : true;
                    
                    return (
                      <div key={field.id} className="flex items-center justify-between py-1">
                        <span className="text-sm font-medium text-gray-700">
                          {field.label}
                        </span>
                        <div className="flex items-center gap-2">
                          {value && (
                            <span className="text-sm text-gray-600 max-w-32 truncate">
                              {String(value)}
                            </span>
                          )}
                          <div className={`w-3 h-3 rounded-full ${
                            isComplete ? 'bg-green-500' : 'bg-gray-300'
                          }`} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">Completion Status</span>
                    <span className={`font-medium ${
                      Object.keys(errors).length === 0 ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {Object.keys(errors).length === 0 ? 'Ready' : `${Object.keys(errors).length} issues`}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}