"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  CheckCircle, 
  AlertTriangle, 
  Truck, 
  Eye,
  Download,
  Search,
  Wrench,
  Shield,
  Lightbulb
} from "lucide-react";

interface ReferenceSection {
  id: string;
  title: string;
  icon: any;
  description: string;
  items: ReferenceItem[];
}

interface ReferenceItem {
  title: string;
  description: string;
  checkPoints: string[];
  commonDefects: string[];
  safetyNotes: string[];
  regulationInfo?: string;
}

const DVIR_REFERENCES: ReferenceSection[] = [
  {
    id: "engine",
    title: "Engine Compartment",
    icon: Wrench,
    description: "Critical engine and fluid system inspections",
    items: [
      {
        title: "Engine Oil",
        description: "Check oil level and condition for proper engine lubrication",
        checkPoints: [
          "Check oil level using dipstick with engine off and level",
          "Oil should be between minimum and maximum marks",
          "Check oil color and consistency",
          "Look for metal particles or foam in oil"
        ],
        commonDefects: [
          "Low oil level",
          "Black, gritty, or contaminated oil",
          "Oil leaks around engine",
          "No oil on dipstick"
        ],
        safetyNotes: [
          "Never check oil while engine is running",
          "Wait 5-10 minutes after shutting off engine",
          "Low oil can cause engine failure"
        ],
        regulationInfo: "DOT requires adequate oil level for safe operation"
      },
      {
        title: "Coolant System", 
        description: "Ensure proper engine temperature regulation",
        checkPoints: [
          "Check coolant level in overflow tank",
          "Inspect radiator condition",
          "Check for leaks around hoses and connections",
          "Verify cap is secure"
        ],
        commonDefects: [
          "Low coolant level",
          "Coolant leaks",
          "Damaged or loose hoses",
          "Corroded radiator"
        ],
        safetyNotes: [
          "Never remove radiator cap when engine is hot",
          "Overheating can cause engine failure",
          "Check coolant mixture for freeze protection"
        ]
      }
    ]
  },
  {
    id: "brakes",
    title: "Brake System",
    icon: Shield,
    description: "Critical brake and air system safety checks",
    items: [
      {
        title: "Air Pressure Build-up",
        description: "Test air compressor and pressure build-up rate",
        checkPoints: [
          "Start with air pressure below 85 psi",
          "Start engine and time pressure build-up",
          "Should build from 85-100 psi in 45 seconds or less",
          "Maximum pressure should be 120-135 psi"
        ],
        commonDefects: [
          "Slow pressure build-up (over 45 seconds)",
          "Pressure doesn't reach minimum (100 psi)",
          "Excessive maximum pressure (over 135 psi)",
          "Compressor not cycling properly"
        ],
        safetyNotes: [
          "Insufficient air pressure prevents safe braking",
          "Never operate vehicle with low air pressure",
          "Listen for air leaks during build-up"
        ],
        regulationInfo: "FMCSR 393.47 - Air brake system requirements"
      },
      {
        title: "Service Brake Test",
        description: "Test service brake operation and effectiveness", 
        checkPoints: [
          "Pump brakes with engine off until low air warning activates",
          "Start engine and build air pressure",
          "Apply service brakes firmly",
          "Check brake feel and stopping power"
        ],
        commonDefects: [
          "Spongy or hard brake pedal",
          "Brake pedal goes to floor",
          "Uneven braking or pulling",
          "Excessive brake travel"
        ],
        safetyNotes: [
          "Test brakes at low speed in safe area",
          "Defective service brakes are out-of-service",
          "Report any brake issues immediately"
        ]
      }
    ]
  },
  {
    id: "tires",
    title: "Tires & Wheels",
    icon: Truck,
    description: "Tire safety and wheel integrity inspection",
    items: [
      {
        title: "Tire Tread Depth",
        description: "Measure and evaluate tire tread for safe traction",
        checkPoints: [
          "Check tread depth with penny test or gauge",
          "Minimum 4/32\" on steer tires, 2/32\" on drive/trailer",
          "Look for even wear patterns across tire",
          "Check for cuts, cracks, or bulges"
        ],
        commonDefects: [
          "Insufficient tread depth",
          "Uneven wear patterns",
          "Sidewall damage or bulges", 
          "Exposed cords or belts"
        ],
        safetyNotes: [
          "Bald tires cause loss of traction",
          "Check tire pressure when cold",
          "Never operate on damaged tires"
        ],
        regulationInfo: "FMCSR 393.75 - Tire specifications"
      }
    ]
  },
  {
    id: "lights",
    title: "Lights & Electrical",
    icon: Lightbulb,
    description: "Visibility and electrical system checks",
    items: [
      {
        title: "Headlight Operation",
        description: "Test all headlight functions for proper visibility",
        checkPoints: [
          "Test low beam headlights",
          "Test high beam headlights", 
          "Check headlight alignment",
          "Verify both lights function"
        ],
        commonDefects: [
          "Burned out bulbs",
          "Cracked or damaged lenses",
          "Poor beam alignment",
          "Dim or flickering lights"
        ],
        safetyNotes: [
          "Proper lighting is required for safe operation",
          "Replace burned bulbs immediately",
          "Clean dirty lenses regularly"
        ]
      }
    ]
  }
];

export default function DVIRReferencePage() {
  const [selectedSection, setSelectedSection] = useState<string>('engine');
  const [selectedItem, setSelectedItem] = useState<ReferenceItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const currentSection = DVIR_REFERENCES.find(section => section.id === selectedSection);
  
  const filteredSections = DVIR_REFERENCES.filter(section =>
    searchQuery === '' || 
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.items.some(item => 
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const downloadChecklist = () => {
    const checklistContent = DVIR_REFERENCES.map(section => {
      return [
        `${section.title.toUpperCase()}`,
        '='.repeat(section.title.length),
        '',
        ...section.items.map(item => [
          `${item.title}:`,
          ...item.checkPoints.map(point => `  □ ${point}`),
          ''
        ].join('\n'))
      ].join('\n');
    }).join('\n\n');

    const blob = new Blob([checklistContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dvir-inspection-checklist.txt';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (selectedItem) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-6 w-6" />
                {selectedItem.title} - Inspection Guide
              </CardTitle>
              <Button
                variant="outline"
                onClick={() => setSelectedItem(null)}
              >
                Back to References
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">Description</h3>
              <p className="text-blue-700">{selectedItem.description}</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Inspection Check Points
              </h3>
              <ul className="space-y-2">
                {selectedItem.checkPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-green-800">{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Common Defects to Look For
              </h3>
              <ul className="space-y-2">
                {selectedItem.commonDefects.map((defect, index) => (
                  <li key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-red-800">{defect}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Shield className="h-5 w-5 text-orange-500" />
                Safety Notes
              </h3>
              <ul className="space-y-2">
                {selectedItem.safetyNotes.map((note, index) => (
                  <li key={index} className="flex items-start gap-3 p-3 bg-orange-50 rounded">
                    <Shield className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span className="text-orange-800">{note}</span>
                  </li>
                ))}
              </ul>
            </div>

            {selectedItem.regulationInfo && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-2">Regulation Reference</h3>
                <p className="text-gray-700 text-sm">{selectedItem.regulationInfo}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          DVIR Reference Guide
        </h1>
        <p className="text-gray-600">
          Comprehensive inspection procedures and DOT compliance reference
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search inspection procedures..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <Button
          onClick={downloadChecklist}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Download Checklist
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Category Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Inspection Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredSections.map(section => {
                const IconComponent = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setSelectedSection(section.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3 ${
                      selectedSection === section.id
                        ? 'bg-blue-100 border-2 border-blue-300'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <IconComponent className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-medium text-sm">{section.title}</div>
                      <div className="text-xs text-gray-500">
                        {section.items.length} procedures
                      </div>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {currentSection && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <currentSection.icon className="h-6 w-6 text-blue-600" />
                  <div>
                    <CardTitle>{currentSection.title}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {currentSection.description}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {currentSection.items.map((item, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedItem(item)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-2">
                            {item.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3">
                            {item.description}
                          </p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              {item.checkPoints.length} check points
                            </span>
                            <span className="flex items-center gap-1 text-red-600">
                              <AlertTriangle className="h-4 w-4" />
                              {item.commonDefects.length} common defects
                            </span>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Quick Reference Cards */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <h3 className="font-semibold text-green-800">DOT Requirements</h3>
            </div>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Daily inspection required for commercial vehicles</li>
              <li>• Driver must complete DVIR form</li>
              <li>• Defects must be corrected before operation</li>
              <li>• Records must be kept for regulatory compliance</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
              <h3 className="font-semibold text-orange-800">Out of Service</h3>
            </div>
            <ul className="text-sm text-orange-700 space-y-1">
              <li>• Brake system defects</li>
              <li>• Steering system problems</li>
              <li>• Tire/wheel issues (blowout risk)</li>
              <li>• Lighting failures affecting visibility</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Lightbulb className="h-6 w-6 text-blue-600" />
              <h3 className="font-semibold text-blue-800">Best Practices</h3>
            </div>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Perform inspection in good lighting</li>
              <li>• Use systematic approach (same order)</li>
              <li>• Document everything thoroughly</li>
              <li>• When in doubt, report the defect</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}