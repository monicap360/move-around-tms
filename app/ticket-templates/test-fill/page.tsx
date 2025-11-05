"use client";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  FileText, 
  Type,
  AlertTriangle,
  Download
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

interface TestTemplate {
  name: string;
  description: string;
  partner_name?: string;
  template_fields: TemplateField[];
  base_image_url?: string;
}

interface FormData {
  [fieldName: string]: string | number;
}

export default function TestFillPage() {
  const [template, setTemplate] = useState<TestTemplate | null>(null);
  const [formData, setFormData] = useState<FormData>({});
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    // Load template from session storage
    const tempTemplate = sessionStorage.getItem('temp_template');
    if (tempTemplate) {
      try {
        const parsed = JSON.parse(tempTemplate);
        setTemplate(parsed);
        
        // Initialize form data
        const initialData: FormData = {};
        parsed.template_fields?.forEach((field: TemplateField) => {
          if (field.default_value) {
            initialData[field.name] = field.default_value;
          } else {
            initialData[field.name] = field.type === 'number' ? 0 : '';
          }
        });
        setFormData(initialData);
      } catch (error) {
        console.error('Error parsing template:', error);
      }
    }
  }, []);

  const handleFieldChange = (fieldName: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    template?.template_fields?.forEach(field => {
      if (field.required) {
        const value = formData[field.name];
        if (!value || (typeof value === 'string' && !value.trim())) {
          newErrors[field.name] = `${field.label} is required`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerateTestPDF = async () => {
    if (!validateForm()) {
      alert('Please fix the validation errors before generating PDF');
      return;
    }

    try {
      // Create a simple PDF with the form data
      const response = await fetch('/api/tickets/generate-test-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_name: template?.name,
          partner_name: template?.partner_name,
          form_data: formData,
          template_fields: template?.template_fields
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `test-ticket-${Date.now()}.pdf`;
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
      alert('Error generating test PDF');
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

  if (!template) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700">No Template Found</h3>
            <p className="text-gray-500 mb-4">Please create a template first before testing.</p>
            <Button onClick={() => window.close()}>
              Close Window
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
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Test Fill: {template.name}
            </h1>
            <p className="text-gray-600">{template.description}</p>
            <Badge variant="outline" className="mt-2">Test Mode - Not Saved</Badge>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleGenerateTestPDF}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Test PDF
            </Button>
            <Button
              variant="ghost"
              onClick={() => window.close()}
            >
              Close
            </Button>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="w-5 h-5" />
                  Test Form Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {template.template_fields?.map((field) => (
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
                )) || (
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
                <CardTitle>Template Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {template.base_image_url ? (
                  <div className="relative">
                    <img
                      src={template.base_image_url}
                      alt="Template"
                      className="w-full rounded-lg border"
                    />
                    
                    {/* Show field values overlaid */}
                    <div className="absolute inset-0">
                      {template.template_fields?.map((field) => {
                        const value = formData[field.name];
                        if (!value) return null;

                        return (
                          <div
                            key={field.id}
                            className="absolute bg-green-500 bg-opacity-30 border border-green-500 flex items-center justify-center text-xs font-medium text-green-800 px-1"
                            style={{
                              left: `${(field.x_position / 800) * 100}%`,
                              top: `${(field.y_position / 1000) * 100}%`,
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

            {/* Test Data Summary */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Form Data Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {template.template_fields?.map((field) => {
                    const value = formData[field.name];
                    
                    return (
                      <div key={field.id} className="flex items-center justify-between py-1 text-sm">
                        <span className="font-medium text-gray-700">
                          {field.label}
                        </span>
                        <span className="text-gray-600 max-w-32 truncate">
                          {value ? String(value) : '(empty)'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {template.template_fields?.length === 0 && (
                  <p className="text-gray-500 text-center py-4">
                    No fields to display
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}