"use client";

import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { 
  FileText, 
  Download, 
  User, 
  Shield, 
  CreditCard, 
  Truck,
  AlertTriangle,
  Building,
  Eye
} from "lucide-react";

interface Template {
  id: string;
  title: string;
  description: string;
  icon: any;
  filename: string;
  required: boolean;
  category: 'employment' | 'safety' | 'administrative';
}

export default function DriverTemplatesPage() {
  const templates: Template[] = [
    {
      id: 'application',
      title: 'Driver Application Form',
      description: 'Complete employment application with personal information, work history, and references',
      icon: User,
      filename: 'ronyx-logistics-application-form.pdf',
      required: true,
      category: 'employment'
    },
    {
      id: 'emergency-contact',
      title: 'Emergency Contact Form',
      description: 'Emergency contact information and medical details for safety purposes',
      icon: AlertTriangle,
      filename: 'ronyx-logistics-emergency-contact-form.pdf',
      required: true,
      category: 'safety'
    },
    {
      id: 'direct-deposit',
      title: 'Direct Deposit Authorization',
      description: 'Banking information for electronic payroll deposits',
      icon: CreditCard,
      filename: 'ronyx-logistics-direct-deposit-form.pdf',
      required: false,
      category: 'administrative'
    },
    {
      id: 'equipment-checklist',
      title: 'Equipment Assignment Checklist',
      description: 'Checklist for receiving and acknowledging company equipment',
      icon: Truck,
      filename: 'ronyx-logistics-equipment-checklist-form.pdf',
      required: true,
      category: 'administrative'
    },
    {
      id: 'safety-acknowledgment',
      title: 'Safety Policy Acknowledgment',
      description: 'Acknowledgment of safety policies, procedures, and DOT regulations',
      icon: Shield,
      filename: 'ronyx-logistics-safety-acknowledgment-form.pdf',
      required: true,
      category: 'safety'
    }
  ];

  const downloadTemplate = async (templateType: string, filename: string) => {
    try {
      const response = await fetch(`/api/driver/templates?template=${templateType}`);
      
      if (!response.ok) {
        throw new Error('Template download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download template. Please try again.');
    }
  };

  const previewTemplate = async (templateType: string) => {
    try {
      const response = await fetch(`/api/driver/templates?template=${templateType}`);
      
      if (!response.ok) {
        throw new Error('Template preview failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Open in new tab for preview
      window.open(url, '_blank');
      
      // Clean up the object URL after a delay
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error('Preview error:', error);
      alert('Failed to preview template. Please try again.');
    }
  };

  const downloadAllTemplates = async () => {
    for (const template of templates) {
      await downloadTemplate(template.id, template.filename);
      // Add small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'employment': return 'text-blue-600';
      case 'safety': return 'text-red-600';
      case 'administrative': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors = {
      employment: 'bg-blue-100 text-blue-800',
      safety: 'bg-red-100 text-red-800',
      administrative: 'bg-green-100 text-green-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[category as keyof typeof colors]}`}>
        {category.charAt(0).toUpperCase() + category.slice(1)}
      </span>
    );
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Driver Onboarding Forms</h1>
          <p className="text-gray-600 mt-2">
            Download and complete these branded forms for your onboarding process
          </p>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Building className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-800">Ronyx Logistics LLC</p>
                <p className="text-blue-700 text-sm">3741 Graves Ave, Groves, Texas 77619</p>
              </div>
            </div>
          </div>
        </div>
        <Button 
          onClick={downloadAllTemplates}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Download className="w-4 h-4" />
          Download All Forms
        </Button>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">How to Use These Forms:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                <li>Download the required forms below</li>
                <li>Print forms and complete in blue or black ink</li>
                <li>Sign and date all forms where indicated</li>
                <li>Scan or photograph completed forms</li>
                <li>Upload through the onboarding portal</li>
              </ol>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Form Categories:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Employment</span>
                  <span className="text-gray-600">Work history and personal information</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">Safety</span>
                  <span className="text-gray-600">Safety policies and emergency contacts</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Administrative</span>
                  <span className="text-gray-600">Payroll and equipment assignments</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => {
          const IconComponent = template.icon;
          return (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gray-100`}>
                      <IconComponent className={`w-5 h-5 ${getCategoryColor(template.category)}`} />
                    </div>
                    <div>
                      {template.required && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 mb-1">
                          Required
                        </span>
                      )}
                    </div>
                  </div>
                  {getCategoryBadge(template.category)}
                </div>
                <CardTitle className="text-lg">{template.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 text-sm leading-relaxed">
                  {template.description}
                </p>
                
                <div className="pt-2 space-y-2">
                  <Button 
                    onClick={() => previewTemplate(template.id)}
                    variant="outline" 
                    className="w-full flex items-center gap-2 hover:bg-green-50 hover:border-green-300"
                  >
                    <Eye className="w-4 h-4" />
                    Preview Form
                  </Button>
                  <Button 
                    onClick={() => downloadTemplate(template.id, template.filename)}
                    variant="outline" 
                    className="w-full flex items-center gap-2 hover:bg-blue-50 hover:border-blue-300"
                  >
                    <Download className="w-4 h-4" />
                    Download Form
                  </Button>
                </div>
                
                <div className="text-xs text-gray-500 border-t pt-3">
                  <p><strong>Filename:</strong> {template.filename}</p>
                  <p><strong>Format:</strong> PDF (Fillable)</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Resources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Required Documents to Upload:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>Commercial Driver's License (CDL)</li>
                <li>DOT Medical Certificate</li>
                <li>TWIC Card (if applicable)</li>
                <li>Social Security Card</li>
                <li>Previous employment verification</li>
                <li>Clean driving record (MVR)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Next Steps:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>Complete and submit all required forms</li>
                <li>Schedule orientation and training</li>
                <li>Equipment assignment and familiarization</li>
                <li>First route assignment</li>
                <li>Follow-up and performance review</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-800">Important Notice</p>
                <p className="text-yellow-700 text-sm mt-1">
                  All forms must be completed accurately and truthfully. Any false information may result in 
                  disqualification from employment. If you have questions about any form, please contact our 
                  HR department before submission.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
