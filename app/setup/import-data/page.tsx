"use client";

import { useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import Link from "next/link";
import {
  Upload,
  FileSpreadsheet,
  Users,
  Truck,
  FileText,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Download,
  X,
  HelpCircle,
} from "lucide-react";

type ImportType = "drivers" | "trucks" | "tickets" | "customers";

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
}

const IMPORT_TYPES: {
  id: ImportType;
  name: string;
  description: string;
  icon: React.ReactNode;
  requiredFields: string[];
  optionalFields: string[];
  templateUrl: string;
}[] = [
  {
    id: "drivers",
    name: "Drivers",
    description: "Import driver information from spreadsheet",
    icon: <Users className="w-6 h-6" />,
    requiredFields: ["name", "phone"],
    optionalFields: ["email", "license_number", "cdl_expiration", "medical_expiration", "hire_date", "pay_rate"],
    templateUrl: "/templates/drivers-import-template.csv",
  },
  {
    id: "trucks",
    name: "Trucks",
    description: "Import fleet vehicles from spreadsheet",
    icon: <Truck className="w-6 h-6" />,
    requiredFields: ["truck_number", "vin"],
    optionalFields: ["plate", "make", "model", "year", "status", "last_inspection"],
    templateUrl: "/templates/trucks-import-template.csv",
  },
  {
    id: "tickets",
    name: "Tickets",
    description: "Import historical ticket data",
    icon: <FileText className="w-6 h-6" />,
    requiredFields: ["ticket_number", "date", "quantity"],
    optionalFields: ["driver_name", "truck_number", "material", "plant", "customer", "pay_rate", "bill_rate"],
    templateUrl: "/templates/tickets-import-template.csv",
  },
  {
    id: "customers",
    name: "Customers",
    description: "Import customer/site information",
    icon: <FileSpreadsheet className="w-6 h-6" />,
    requiredFields: ["name"],
    optionalFields: ["address", "city", "state", "zip", "phone", "email", "contact_name", "billing_email"],
    templateUrl: "/templates/customers-import-template.csv",
  },
];

export default function DataImportWizard() {
  const [step, setStep] = useState<"select" | "upload" | "map" | "preview" | "import" | "complete">("select");
  const [selectedType, setSelectedType] = useState<ImportType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);

  const selectedTypeConfig = IMPORT_TYPES.find((t) => t.id === selectedType);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = text.split("\n").map((row) => 
        row.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))
      );
      
      if (rows.length > 0) {
        setHeaders(rows[0]);
        setCsvData(rows.slice(1).filter((row) => row.some((cell) => cell)));
        
        // Auto-map columns based on header names
        const autoMappings: ColumnMapping[] = [];
        const allFields = [...(selectedTypeConfig?.requiredFields || []), ...(selectedTypeConfig?.optionalFields || [])];
        
        rows[0].forEach((header) => {
          const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "_");
          const matchedField = allFields.find((field) => 
            field === normalizedHeader || 
            field.includes(normalizedHeader) || 
            normalizedHeader.includes(field)
          );
          if (matchedField) {
            autoMappings.push({ sourceColumn: header, targetField: matchedField });
          }
        });
        
        setColumnMappings(autoMappings);
        setStep("map");
      }
    };
    reader.readAsText(uploadedFile);
  }, [selectedTypeConfig]);

  const updateMapping = (sourceColumn: string, targetField: string) => {
    setColumnMappings((prev) => {
      const existing = prev.find((m) => m.sourceColumn === sourceColumn);
      if (existing) {
        if (targetField === "") {
          return prev.filter((m) => m.sourceColumn !== sourceColumn);
        }
        return prev.map((m) => 
          m.sourceColumn === sourceColumn ? { ...m, targetField } : m
        );
      }
      if (targetField) {
        return [...prev, { sourceColumn, targetField }];
      }
      return prev;
    });
  };

  const generatePreview = () => {
    const preview = csvData.slice(0, 5).map((row) => {
      const mappedRow: Record<string, string> = {};
      columnMappings.forEach((mapping) => {
        const colIndex = headers.indexOf(mapping.sourceColumn);
        if (colIndex >= 0) {
          mappedRow[mapping.targetField] = row[colIndex] || "";
        }
      });
      return mappedRow;
    });
    setPreviewRows(preview);
    setStep("preview");
  };

  const performImport = async () => {
    if (!selectedType || !selectedTypeConfig) return;

    setImporting(true);
    setStep("import");

    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get organization ID
      const { data: orgMember } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      const organizationId = orgMember?.organization_id;

      // Process each row
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        const mappedData: Record<string, string | number | null> = {};
        
        columnMappings.forEach((mapping) => {
          const colIndex = headers.indexOf(mapping.sourceColumn);
          if (colIndex >= 0) {
            mappedData[mapping.targetField] = row[colIndex] || null;
          }
        });

        // Add organization_id
        if (organizationId) {
          mappedData.organization_id = organizationId;
        }

        try {
          let tableName = "";
          switch (selectedType) {
            case "drivers":
              tableName = "drivers";
              break;
            case "trucks":
              tableName = "trucks";
              break;
            case "tickets":
              tableName = "aggregate_tickets";
              break;
            case "customers":
              tableName = "customers";
              break;
          }

          const { error } = await supabase.from(tableName).insert(mappedData);
          
          if (error) {
            result.failed++;
            if (result.errors.length < 10) {
              result.errors.push(`Row ${i + 1}: ${error.message}`);
            }
          } else {
            result.success++;
          }
        } catch (err) {
          result.failed++;
          if (result.errors.length < 10) {
            result.errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : "Unknown error"}`);
          }
        }
      }

      setImportResult(result);
      setStep("complete");
    } catch (err) {
      console.error("Import error:", err);
      result.errors.push(err instanceof Error ? err.message : "Import failed");
      setImportResult(result);
      setStep("complete");
    } finally {
      setImporting(false);
    }
  };

  const resetWizard = () => {
    setStep("select");
    setSelectedType(null);
    setFile(null);
    setCsvData([]);
    setHeaders([]);
    setColumnMappings([]);
    setImportResult(null);
    setPreviewRows([]);
  };

  const allRequiredFieldsMapped = selectedTypeConfig?.requiredFields.every((field) =>
    columnMappings.some((m) => m.targetField === field)
  );

  return (
    <div className="min-h-screen bg-space-deep p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="outline" size="sm" className="border-space-border text-text-secondary hover:text-text-primary">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-medium text-text-primary uppercase tracking-wider">
              Data Import Wizard
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              Import your existing data from spreadsheets
            </p>
          </div>
        </div>

        {/* Step: Select Import Type */}
        {step === "select" && (
          <Card className="bg-space-panel border-space-border">
            <CardHeader className="border-b border-space-border">
              <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
                Select Data Type to Import
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {IMPORT_TYPES.map((type) => (
                  <div
                    key={type.id}
                    onClick={() => {
                      setSelectedType(type.id);
                      setStep("upload");
                    }}
                    className="p-6 rounded border border-space-border hover:border-gold-primary cursor-pointer transition-all bg-space-surface"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-gold-primary">{type.icon}</div>
                      <div>
                        <h3 className="text-text-primary font-medium">{type.name}</h3>
                        <p className="text-text-secondary text-xs mt-1">{type.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-space-surface rounded border border-space-border">
                <div className="flex items-center gap-2 text-text-secondary mb-2">
                  <HelpCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Tips for Successful Import</span>
                </div>
                <ul className="text-text-secondary text-xs space-y-1 ml-6">
                  <li>Use CSV format (comma-separated values)</li>
                  <li>Include column headers in the first row</li>
                  <li>Ensure dates are in YYYY-MM-DD format</li>
                  <li>Remove any special characters from phone numbers</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Upload File */}
        {step === "upload" && selectedTypeConfig && (
          <Card className="bg-space-panel border-space-border">
            <CardHeader className="border-b border-space-border">
              <CardTitle className="text-text-primary text-sm uppercase tracking-wider flex items-center gap-2">
                <Upload className="w-4 h-4 text-gold-primary" />
                Upload {selectedTypeConfig.name} File
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {/* File Upload Area */}
                <div className="border-2 border-dashed border-space-border rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer"
                  >
                    <Upload className="w-12 h-12 text-text-secondary mx-auto mb-4" />
                    <p className="text-text-primary font-medium mb-2">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-text-secondary text-sm">
                      CSV files only (max 10MB)
                    </p>
                  </label>
                </div>

                {/* Required Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-space-surface rounded border border-space-border">
                    <h4 className="text-text-primary text-sm font-medium mb-2">Required Fields</h4>
                    <ul className="text-text-secondary text-xs space-y-1">
                      {selectedTypeConfig.requiredFields.map((field) => (
                        <li key={field} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-gold-primary rounded-full" />
                          {field.replace(/_/g, " ")}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 bg-space-surface rounded border border-space-border">
                    <h4 className="text-text-primary text-sm font-medium mb-2">Optional Fields</h4>
                    <ul className="text-text-secondary text-xs space-y-1">
                      {selectedTypeConfig.optionalFields.map((field) => (
                        <li key={field} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-text-secondary rounded-full" />
                          {field.replace(/_/g, " ")}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Download Template */}
                <div className="flex items-center justify-between p-4 bg-space-surface rounded border border-space-border">
                  <div>
                    <p className="text-text-primary text-sm font-medium">Need a template?</p>
                    <p className="text-text-secondary text-xs">
                      Download our pre-formatted CSV template
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-space-border text-text-secondary hover:text-text-primary"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep("select")}
                    className="border-space-border text-text-secondary"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Map Columns */}
        {step === "map" && selectedTypeConfig && (
          <Card className="bg-space-panel border-space-border">
            <CardHeader className="border-b border-space-border">
              <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
                Map Columns
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-text-secondary text-sm mb-6">
                Match your spreadsheet columns to the system fields. Required fields are marked with *.
              </p>

              <div className="space-y-3">
                {headers.map((header) => {
                  const currentMapping = columnMappings.find((m) => m.sourceColumn === header);
                  return (
                    <div key={header} className="flex items-center gap-4 p-3 bg-space-surface rounded border border-space-border">
                      <div className="flex-1">
                        <span className="text-text-primary text-sm">{header}</span>
                        <span className="text-text-secondary text-xs ml-2">
                          (Sample: {csvData[0]?.[headers.indexOf(header)] || "empty"})
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-text-secondary" />
                      <select
                        value={currentMapping?.targetField || ""}
                        onChange={(e) => updateMapping(header, e.target.value)}
                        className="w-48 p-2 bg-space-deep border border-space-border rounded text-text-primary text-sm"
                      >
                        <option value="">-- Skip this column --</option>
                        <optgroup label="Required Fields">
                          {selectedTypeConfig.requiredFields.map((field) => (
                            <option key={field} value={field}>
                              {field.replace(/_/g, " ")} *
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Optional Fields">
                          {selectedTypeConfig.optionalFields.map((field) => (
                            <option key={field} value={field}>
                              {field.replace(/_/g, " ")}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  );
                })}
              </div>

              {!allRequiredFieldsMapped && (
                <div className="mt-4 p-3 bg-orange-900/20 border border-orange-500/30 rounded flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  <span className="text-orange-400 text-sm">
                    Please map all required fields before continuing
                  </span>
                </div>
              )}

              <div className="flex justify-between pt-6">
                <Button
                  variant="outline"
                  onClick={() => setStep("upload")}
                  className="border-space-border text-text-secondary"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={generatePreview}
                  disabled={!allRequiredFieldsMapped}
                  className="bg-gold-primary text-space-deep hover:bg-gold-secondary"
                >
                  Preview Import
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Preview */}
        {step === "preview" && selectedTypeConfig && (
          <Card className="bg-space-panel border-space-border">
            <CardHeader className="border-b border-space-border">
              <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
                Preview Import Data
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-text-secondary text-sm mb-4">
                Review the first 5 rows of your import. {csvData.length} total rows will be imported.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-space-border">
                      {columnMappings.map((mapping) => (
                        <th key={mapping.targetField} className="text-left p-2 text-text-secondary text-xs uppercase">
                          {mapping.targetField.replace(/_/g, " ")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, idx) => (
                      <tr key={idx} className="border-b border-space-border">
                        {columnMappings.map((mapping) => (
                          <td key={mapping.targetField} className="p-2 text-text-primary">
                            {row[mapping.targetField] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 p-4 bg-space-surface rounded border border-space-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-primary font-medium">Ready to Import</p>
                    <p className="text-text-secondary text-xs">
                      {csvData.length} {selectedTypeConfig.name.toLowerCase()} will be imported
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-text-secondary text-xs">Mapped Fields</p>
                    <p className="text-gold-primary font-medium">{columnMappings.length}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-6">
                <Button
                  variant="outline"
                  onClick={() => setStep("map")}
                  className="border-space-border text-text-secondary"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={performImport}
                  className="bg-gold-primary text-space-deep hover:bg-gold-secondary"
                >
                  Start Import
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Importing */}
        {step === "import" && (
          <Card className="bg-space-panel border-space-border">
            <CardContent className="py-12 text-center">
              <Loader2 className="w-12 h-12 text-gold-primary animate-spin mx-auto mb-4" />
              <h2 className="text-text-primary font-medium mb-2">Importing Data...</h2>
              <p className="text-text-secondary text-sm">
                Please wait while we process your data
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step: Complete */}
        {step === "complete" && importResult && (
          <Card className="bg-space-panel border-space-border">
            <CardContent className="py-8">
              <div className="text-center mb-8">
                {importResult.failed === 0 ? (
                  <>
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-400" />
                    </div>
                    <h2 className="text-xl font-medium text-text-primary mb-2">
                      Import Complete!
                    </h2>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle className="w-8 h-8 text-orange-400" />
                    </div>
                    <h2 className="text-xl font-medium text-text-primary mb-2">
                      Import Completed with Errors
                    </h2>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-space-surface rounded border border-space-border text-center">
                  <p className="text-3xl font-bold text-green-400">{importResult.success}</p>
                  <p className="text-text-secondary text-sm">Successfully Imported</p>
                </div>
                <div className="p-4 bg-space-surface rounded border border-space-border text-center">
                  <p className="text-3xl font-bold text-red-400">{importResult.failed}</p>
                  <p className="text-text-secondary text-sm">Failed</p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="mb-8 p-4 bg-red-900/20 border border-red-500/30 rounded">
                  <h3 className="text-red-400 font-medium mb-2">Errors</h3>
                  <ul className="text-red-300 text-xs space-y-1">
                    {importResult.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={resetWizard}
                  className="border-space-border text-text-secondary"
                >
                  Import More Data
                </Button>
                <Link href="/">
                  <Button className="bg-gold-primary text-space-deep hover:bg-gold-secondary">
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
