"use client";

import { supabase } from "../../lib/supabaseClient";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import { useState } from "react";

export default function ExcelTab() {
  const [file, setFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<any>(null);
  const [mapping, setMapping] = useState<any>({});
  const [data, setData] = useState<any[]>([]);
  const [status, setStatus] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [preview, setPreview] = useState<any[]>([]);
  const [error, setError] = useState<string>("");
  const [uploadMeta, setUploadMeta] = useState<any>({});
  const [processing, setProcessing] = useState(false);
  const [report, setReport] = useState<any>(null);

  // File upload and parsing
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setError("");
    if (!f) return;
    setStatus("Parsing...");
    let parsed: any[] = [];
    try {
      if (f.name.endsWith(".csv")) {
        Papa.parse(f, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            setData(results.data);
            setPreview(results.data.slice(0, 10));
            setStatus("Parsed CSV");
          },
          error: (err) => setError("CSV Parse error: " + err.message),
        });
      } else if (f.name.endsWith(".xlsx")) {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const arrayBuffer = evt.target?.result as ArrayBuffer;
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer);
            const worksheet = workbook.worksheets[0];
            const json: any[] = [];
            
            // Convert worksheet to JSON
            worksheet.eachRow((row, rowNumber) => {
              if (rowNumber === 1) {
                // Skip header row or use it as keys
                return;
              }
              const rowData: any = {};
              row.eachCell((cell, colNumber) => {
                const headerCell = worksheet.getRow(1).getCell(colNumber);
                const header = headerCell.value?.toString() || `Column${colNumber}`;
                rowData[header] = cell.value?.toString() || "";
              });
              if (Object.keys(rowData).length > 0) {
                json.push(rowData);
              }
            });
            
            setData(json);
            setPreview(json.slice(0, 10));
            setStatus("Parsed Excel");
          } catch (err: any) {
            setError("Excel parse error: " + err.message);
          }
        };
        reader.readAsArrayBuffer(f);
      } else {
        setError("Unsupported file type");
      }
    } catch (err: any) {
      setError("Parse error: " + err.message);
    }
  };

  // Data mapping UI (simplified for demo)
  const columns = data[0] ? Object.keys(data[0]) : [];

  // Calculation logic (payroll, IFTA, material, etc.)
  const handleProcess = () => {
    setProcessing(true);
    setError("");
    // Example: Payroll calculation
    let payroll: Record<string, number> = {};
    let iftaMiles = 0,
      iftaGallons = 0;
    let materialTotals: Record<string, number> = {};
    let errors: string[] = [];
    data.forEach((row, idx) => {
      // Payroll: sum by driver
      const driver =
        row[mapping.driver_name] ||
        row["Driver Name"] ||
        row["driver"] ||
        row["Driver"];
      const pay = parseFloat(row[mapping.rate] || row["Rate"] || 0);
      if (driver) payroll[driver] = (payroll[driver] || 0) + pay;
      // IFTA: sum miles/gallons
      iftaMiles += parseFloat(row[mapping.miles] || row["Miles Driven"] || 0);
      iftaGallons += parseFloat(
        row[mapping.gallons] || row["Gallons Purchased"] || 0,
      );
      // Material: sum by type
      const mat = row[mapping.material] || row["Material"] || "";
      const qty = parseFloat(row[mapping.qty] || row["Quantity"] || 0);
      if (mat) materialTotals[mat] = (materialTotals[mat] || 0) + qty;
      // Error check
      if (!driver || isNaN(pay))
        errors.push(`Row ${idx + 1}: Missing driver or pay`);
    });
    setReport({ payroll, iftaMiles, iftaGallons, materialTotals, errors });
    setProcessing(false);
  };

  // Export logic (CSV)
  const handleExport = () => {
    if (!report) return;
    const rows = [
      ["Driver", "Total Pay"],
      ...Object.entries(report.payroll || {}),
    ];
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "payroll_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Audit log (Supabase)
  const logAudit = async (action: string) => {
    await supabase.from("audit_log").insert({
      action,
      file_name: file?.name,
      user: uploadMeta.uploadedBy || "Unknown",
      timestamp: new Date().toISOString(),
      notes,
    });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)",
        padding: 0,
      }}
    >
      <h1
        style={{
          fontSize: 40,
          fontWeight: 700,
          marginBottom: 16,
          color: "#1e293b",
        }}
      >
        Reports & Excel Upload
      </h1>
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 2px 8px rgba(30,41,59,0.08)",
          padding: 32,
          marginBottom: 32,
        }}
      >
        {/* 1. Upload Section */}
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#2563eb",
            marginBottom: 16,
          }}
        >
          Upload File (.xlsx / .csv)
        </div>
        <input type="file" accept=".xlsx,.csv" onChange={handleFileChange} />
        {status && (
          <div style={{ color: "#059669", marginTop: 8 }}>{status}</div>
        )}
        {error && <div style={{ color: "#dc2626", marginTop: 8 }}>{error}</div>}
        <div style={{ marginTop: 12 }}>
          <input
            placeholder="Upload Date / Time"
            style={inputStyle}
            onChange={(e) =>
              setUploadMeta((m: any) => ({ ...m, date: e.target.value }))
            }
          />
          <input
            placeholder="Uploaded By (User / Driver / Admin)"
            style={inputStyle}
            onChange={(e) =>
              setUploadMeta((m: any) => ({ ...m, uploadedBy: e.target.value }))
            }
          />
          <select
            style={inputStyle}
            onChange={(e) =>
              setUploadMeta((m: any) => ({ ...m, purpose: e.target.value }))
            }
          >
            <option>File Type / Purpose</option>
            <option>Payroll Calculation</option>
            <option>IFTA / Fuel & Mileage Data</option>
            <option>Material / Load Data</option>
            <option>Custom Reports</option>
          </select>
          <input
            placeholder="File Name / Description"
            style={inputStyle}
            onChange={(e) =>
              setUploadMeta((m: any) => ({ ...m, description: e.target.value }))
            }
          />
          <select
            style={inputStyle}
            onChange={(e) =>
              setUploadMeta((m: any) => ({ ...m, status: e.target.value }))
            }
          >
            <option>Status: Pending</option>
            <option>Processed</option>
            <option>Error</option>
          </select>
          <textarea
            placeholder="Notes / Comments"
            style={{ ...inputStyle, minHeight: 60 }}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <button
          style={{
            marginTop: 16,
            fontSize: 18,
            fontWeight: 600,
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 28px",
          }}
          onClick={() => logAudit("upload")}
        >
          Choose File → Upload
        </button>
        {/* 2. Data Mapping & Settings */}
        {columns.length > 0 && (
          <>
            <div
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: "#1e293b",
                marginTop: 32,
              }}
            >
              Data Mapping & Settings
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginTop: 8,
              }}
            >
              <select
                style={inputStyle}
                onChange={(e) =>
                  setMapping((m: any) => ({
                    ...m,
                    driver_name: e.target.value,
                  }))
                }
              >
                <option value="">Driver Name</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
              <select
                style={inputStyle}
                onChange={(e) =>
                  setMapping((m: any) => ({ ...m, rate: e.target.value }))
                }
              >
                <option value="">Rate</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
              <select
                style={inputStyle}
                onChange={(e) =>
                  setMapping((m: any) => ({ ...m, miles: e.target.value }))
                }
              >
                <option value="">Miles Driven</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
              <select
                style={inputStyle}
                onChange={(e) =>
                  setMapping((m: any) => ({ ...m, gallons: e.target.value }))
                }
              >
                <option value="">Gallons Purchased</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
              <select
                style={inputStyle}
                onChange={(e) =>
                  setMapping((m: any) => ({ ...m, material: e.target.value }))
                }
              >
                <option value="">Material</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
              <select
                style={inputStyle}
                onChange={(e) =>
                  setMapping((m: any) => ({ ...m, qty: e.target.value }))
                }
              >
                <option value="">Quantity</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginTop: 8 }}>
              <label>
                <input type="checkbox" /> Save mapping template for recurring
                uploads
              </label>
            </div>
            <button
              style={{
                marginTop: 16,
                fontSize: 18,
                fontWeight: 600,
                background: "#059669",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 28px",
              }}
              onClick={handleProcess}
              disabled={processing}
            >
              Process & Calculate
            </button>
          </>
        )}
        {/* 3. Calculation & Processing */}
        {report && (
          <>
            <div
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: "#1e293b",
                marginTop: 32,
              }}
            >
              Calculation & Processing
            </div>
            <ul
              style={{
                color: "#2563eb",
                fontSize: 17,
                marginLeft: 24,
                marginBottom: 8,
              }}
            >
              <li>
                Payroll Summary:{" "}
                {Object.entries(report.payroll || {})
                  .map(([d, amt]) => `${d}: $${typeof amt === 'number' ? amt.toFixed(2) : '0.00'}`)
                  .join(", ")}
              </li>
              <li>
                IFTA Miles: {report.iftaMiles}, Gallons: {report.iftaGallons}
              </li>
              <li>
                Material Totals:{" "}
                {Object.entries(report.materialTotals || {})
                  .map(([m, q]) => `${m}: ${q}`)
                  .join(", ")}
              </li>
              <li>Errors: {report.errors?.join("; ") || "None"}</li>
            </ul>
            <button
              style={{
                marginTop: 8,
                fontSize: 18,
                fontWeight: 600,
                background: "#0ea5e9",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 28px",
              }}
              onClick={handleExport}
            >
              Export Payroll CSV
            </button>
          </>
        )}
        {/* 4. Reports & Export */}
        {/* 5. Optional Features */}
      </div>
    </div>
  );
}

const inputStyle = {
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  padding: "8px 12px",
  fontSize: 18,
  color: "#334155",
  background: "#f8fafc",
  width: "100%",
  marginBottom: 0,
};
