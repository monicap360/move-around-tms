"use client";

import { useState, useCallback } from "react";
import ExcelJS from "exceljs";
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

type ImportType =
  | "drivers"
  | "trucks"
  | "tickets"
  | "customers"
  | "pit_data"
  | "material_receipts"
  | "supplier_invoices"
  | "po_data";

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

interface ImportDiagnostics {
  warnings: string[];
  errorCells: number;
  duplicateRows: number;
  mixedUom: boolean;
  negativeQuantities: number;
  outOfRangePrices: number;
  futureDates: number;
  formulaCells: number;
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
    optionalFields: [
      "address",
      "city",
      "state",
      "zip",
      "contact_name",
      "contact_email",
      "contact_phone",
      "ein",
      "dot_number",
      "mc_number",
    ],
    templateUrl: "/templates/customers-import-template.csv",
  },
  {
    id: "pit_data",
    name: "PIT Data",
    description: "Import production intake records",
    icon: <FileSpreadsheet className="w-6 h-6" />,
    requiredFields: ["material_number", "quantity", "uom"],
    optionalFields: ["batch_lot", "received_date", "price", "source_reference"],
    templateUrl: "/templates/pit-import-template.csv",
  },
  {
    id: "material_receipts",
    name: "Material Receipts",
    description: "Import warehouse receiving data",
    icon: <FileSpreadsheet className="w-6 h-6" />,
    requiredFields: ["material_number", "quantity", "uom", "receipt_date"],
    optionalFields: ["batch_lot", "supplier", "po_number", "quality_notes", "quality_hold", "received_by"],
    templateUrl: "/templates/receipts-import-template.csv",
  },
  {
    id: "supplier_invoices",
    name: "Supplier Invoices",
    description: "Import supplier invoice data",
    icon: <FileSpreadsheet className="w-6 h-6" />,
    requiredFields: ["material_number", "quantity", "uom", "invoice_date"],
    optionalFields: ["batch_lot", "unit_price", "total_amount", "invoice_number", "po_number"],
    templateUrl: "/templates/invoices-import-template.csv",
  },
  {
    id: "po_data",
    name: "PO Data",
    description: "Import purchase order data",
    icon: <FileSpreadsheet className="w-6 h-6" />,
    requiredFields: ["material_number", "quantity", "uom", "po_date"],
    optionalFields: ["batch_lot", "unit_price", "po_number", "supplier"],
    templateUrl: "/templates/po-import-template.csv",
  },
];

export default function DataImportWizard() {
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const [step, setStep] = useState<"select" | "upload" | "map" | "preview" | "import" | "complete">("select");
  const [selectedType, setSelectedType] = useState<ImportType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [diagnostics, setDiagnostics] = useState<ImportDiagnostics | null>(null);

  const selectedTypeConfig = IMPORT_TYPES.find((t) => t.id === selectedType);

  const parseCsv = (text: string) => {
    const rows: string[][] = [];
    let current = "";
    let row: string[] = [];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"' && nextChar === '"') {
        current += '"';
        i++;
        continue;
      }

      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (char === "," && !inQuotes) {
        row.push(current);
        current = "";
        continue;
      }

      if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && nextChar === "\n") {
          i++;
        }
        row.push(current);
        if (row.some((cell) => cell.trim() !== "")) {
          rows.push(row.map((cell) => cell.trim()));
        }
        row = [];
        current = "";
        continue;
      }

      current += char;
    }

    if (current.length > 0 || row.length > 0) {
      row.push(current);
      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row.map((cell) => cell.trim()));
      }
    }

    return rows;
  };

  const analyzeData = (
    headerRow: string[],
    rows: string[][],
    formulaCells: number,
  ): ImportDiagnostics => {
    const warnings: string[] = [];
    let errorCells = 0;
    let duplicateRows = 0;
    let negativeQuantities = 0;
    let outOfRangePrices = 0;
    let futureDates = 0;
    let mixedUom = false;

    const errorTokens = ["#N/A", "#VALUE!", "#REF!", "#DIV/0!", "#NAME?"];
    const uomSet = new Set<string>();
    const seenRows = new Set<string>();

    const quantityIndex = headerRow.findIndex((h) =>
      h.toLowerCase().includes("quantity"),
    );
    const priceIndex = headerRow.findIndex((h) =>
      h.toLowerCase().includes("price"),
    );
    const uomIndex = headerRow.findIndex((h) => h.toLowerCase() === "uom");
    const dateIndex = headerRow.findIndex((h) =>
      h.toLowerCase().includes("date"),
    );

    rows.forEach((row) => {
      row.forEach((cell) => {
        if (typeof cell === "string" && errorTokens.includes(cell.trim())) {
          errorCells += 1;
        }
      });

      const rowKey = row.join("|");
      if (seenRows.has(rowKey)) duplicateRows += 1;
      seenRows.add(rowKey);

      if (uomIndex >= 0) {
        const uom = row[uomIndex]?.toLowerCase().trim();
        if (uom) uomSet.add(uom);
      }

      if (quantityIndex >= 0) {
        const qty = Number(row[quantityIndex]);
        if (!Number.isNaN(qty) && qty < 0) negativeQuantities += 1;
      }

      if (priceIndex >= 0) {
        const price = Number(row[priceIndex]);
        if (!Number.isNaN(price) && (price <= 0 || price > 100000)) {
          outOfRangePrices += 1;
        }
      }

      if (dateIndex >= 0) {
        const value = row[dateIndex];
        const parsed = value ? new Date(value) : null;
        if (parsed && !Number.isNaN(parsed.getTime())) {
          const now = new Date();
          const diffDays = (parsed.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays > 30) {
            futureDates += 1;
          }
        }
      }
    });

    if (uomSet.size > 1) mixedUom = true;
    if (errorCells > 0) warnings.push("Excel error tokens found (#N/A, #REF!, etc).");
    if (duplicateRows > 0) warnings.push("Duplicate rows detected.");
    if (negativeQuantities > 0) warnings.push("Negative quantities detected.");
    if (outOfRangePrices > 0) warnings.push("Unit prices outside expected range.");
    if (futureDates > 0) warnings.push("Dates far in the future detected.");
    if (mixedUom) warnings.push("Mixed units of measure detected.");
    if (formulaCells > 0) warnings.push("Formula cells detected and preserved.");

    return {
      warnings,
      errorCells,
      duplicateRows,
      mixedUom,
      negativeQuantities,
      outOfRangePrices,
      futureDates,
      formulaCells,
    };
  };

  const parseExcel = async (buffer: ArrayBuffer) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];
    const rows: string[][] = [];
    let formulaCells = 0;

    worksheet.eachRow((row) => {
      const values: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell) => {
        const cellValue: any = cell.value;
        if (cellValue && typeof cellValue === "object" && "formula" in cellValue) {
          formulaCells += 1;
          values.push(String(cellValue.result ?? ""));
        } else {
          values.push(String(cellValue ?? ""));
        }
      });
      rows.push(values.map((value) => value.trim()));
    });

    const headerRow = rows[0] || [];
    const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell));
    const diagnostics = analyzeData(headerRow, dataRows, formulaCells);

    return { headerRow, dataRows, diagnostics };
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);

    if (uploadedFile.name.endsWith(".xlsx")) {
      const buffer = await uploadedFile.arrayBuffer();
      const { headerRow, dataRows, diagnostics } = await parseExcel(buffer);
      setHeaders(headerRow);
      setCsvData(dataRows);
      setDiagnostics(diagnostics);
      // Auto-map columns based on header names
      const autoMappings: ColumnMapping[] = [];
      const allFields = [
        ...(selectedTypeConfig?.requiredFields || []),
        ...(selectedTypeConfig?.optionalFields || []),
      ];

      headerRow.forEach((header) => {
        const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "_");
        const matchedField = allFields.find(
          (field) =>
            field === normalizedHeader ||
            field.includes(normalizedHeader) ||
            normalizedHeader.includes(field),
        );
        if (matchedField) {
          autoMappings.push({ sourceColumn: header, targetField: matchedField });
        }
      });

      setColumnMappings(autoMappings);
      setStep("map");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = parseCsv(text);

      if (rows.length > 0) {
        setHeaders(rows[0]);
        const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell));
        setCsvData(dataRows);
        setDiagnostics(analyzeData(rows[0], dataRows, 0));

        // Auto-map columns based on header names
        const autoMappings: ColumnMapping[] = [];
        const allFields = [
          ...(selectedTypeConfig?.requiredFields || []),
          ...(selectedTypeConfig?.optionalFields || []),
        ];

        rows[0].forEach((header) => {
          const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "_");
          const matchedField = allFields.find(
            (field) =>
              field === normalizedHeader ||
              field.includes(normalizedHeader) ||
              normalizedHeader.includes(field),
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
    if (demoMode) {
      setImportResult({
        success: 0,
        failed: 0,
        errors: ["Import is disabled in demo mode."],
      });
      setStep("complete");
      return;
    }

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
            let value: string | number | null = row[colIndex] || null;

            if (value !== null) {
              const field = mapping.targetField.toLowerCase();
              if (
                field.includes("quantity") ||
                field.includes("price") ||
                field.includes("rate") ||
                field.includes("total")
              ) {
                const num = Number(value);
                value = Number.isNaN(num) ? null : num;
              } else if (field.includes("date") || field.includes("expiration")) {
                const parsed = new Date(value);
                value = Number.isNaN(parsed.getTime())
                  ? null
                  : parsed.toISOString().split("T")[0];
              } else if (field.includes("quality_hold")) {
                value = value.toString().toLowerCase() === "true";
              }
            }

            mappedData[mapping.targetField] = value;
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
              tableName = "vendors";
              break;
            case "pit_data":
              tableName = "pit_data";
              break;
            case "material_receipts":
              tableName = "material_receipts";
              break;
            case "supplier_invoices":
              tableName = "supplier_invoices";
              break;
            case "po_data":
              tableName = "po_data";
              break;
          }

          if (selectedType === "customers") {
            mappedData.type = "Customer";
            const addressParts = [
              mappedData.address,
              mappedData.city,
              mappedData.state,
              mappedData.zip,
            ]
              .map((value) => (value ? String(value).trim() : ""))
              .filter(Boolean);
            if (addressParts.length > 0) {
              mappedData.address = addressParts.join(", ");
            }
            delete mappedData.city;
            delete mappedData.state;
            delete mappedData.zip;
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

      await supabase.from("import_audits").insert({
        organization_id: organizationId,
        import_type: selectedType,
        file_name: file?.name || null,
        rows_count: csvData.length,
        success_count: result.success,
        failure_count: result.failed,
        error_count: result.errors.length,
        warning_count: diagnostics?.warnings?.length || 0,
        diagnostics: diagnostics || {},
        created_by: user.id,
      });

      if (diagnostics) {
        const criticalIssues =
          diagnostics.errorCells > 0 ||
          diagnostics.negativeQuantities > 0 ||
          diagnostics.outOfRangePrices > 0;

        if (criticalIssues) {
          await supabase.from("workflow_tickets").insert({
            organization_id: organizationId,
            source_type: "excel_import",
            department: "accounting",
            title: "Excel import requires review",
            description: `Detected ${diagnostics.warnings.length} warning(s) in ${file?.name || "spreadsheet"}.`,
            status: "open",
          });
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
    setDiagnostics(null);
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
        {demoMode && (
          <div className="mb-6 p-4 rounded border border-orange-400 bg-orange-50 text-orange-700 text-sm">
            Import is disabled in demo mode. Switch off demo mode to import data.
          </div>
        )}

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
                  <li>Use CSV or Excel (XLSX) format</li>
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
                    accept=".csv,.xlsx"
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
                      CSV or Excel files (max 10MB)
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
                  <a href={selectedTypeConfig.templateUrl}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-space-border text-text-secondary hover:text-text-primary"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Template
                    </Button>
                  </a>
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

              {diagnostics && (
                <div className="mb-6 p-4 bg-space-surface rounded border border-space-border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-text-primary font-medium">Excel Diagnostics</p>
                    <span className="text-xs text-text-secondary">
                      {diagnostics.warnings.length} warnings
                    </span>
                  </div>
                  {diagnostics.warnings.length === 0 ? (
                    <p className="text-text-secondary text-sm">No issues detected.</p>
                  ) : (
                    <ul className="text-text-secondary text-xs space-y-1 list-disc ml-4">
                      {diagnostics.warnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4 text-xs text-text-secondary">
                    <div>Errors: {diagnostics.errorCells}</div>
                    <div>Duplicates: {diagnostics.duplicateRows}</div>
                    <div>Negative Qty: {diagnostics.negativeQuantities}</div>
                    <div>Price Outliers: {diagnostics.outOfRangePrices}</div>
                    <div>Future Dates: {diagnostics.futureDates}</div>
                    <div>Formula Cells: {diagnostics.formulaCells}</div>
                  </div>
                </div>
              )}

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
