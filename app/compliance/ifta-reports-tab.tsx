"use client";
import React, { useEffect, useMemo, useState } from 'react';
import jsPDF from "jspdf";
import { supabase } from '../../lib/supabaseClient';

const TAX_RATES: { [key: string]: number } = {
  TX: 0.2,
  OK: 0.17,
  NM: 0.189,
  AR: 0.279,
  LA: 0.2,
  CO: 0.25,
  KS: 0.26,
  MO: 0.224,
  NE: 0.288,
  IA: 0.329,
};

// Types for records
type FuelReceipt = {
  id: string;
  upload_date: string;
  driver_truck_number: string;
  fuel_type: string;
  gallons: number;
  cost_per_gallon: number;
  total_cost: number;
  location: string;
  vendor: string;
  file_url: string;
};

type MileageLog = {
  id: string;
  upload_date: string;
  truck_number: string;
  driver_name: string;
  start_odometer: number;
  end_odometer: number;
  total_miles: number;
  jurisdiction_miles: string;
  file_url: string;
};

type ComplianceRecord = {
  id: string;
  period: string;
  submission_date: string;
  filed_by: string;
  notes: string;
  return_copy_url: string;
  audit_log: string;
};

function IFTAReportsTab() {
  const [fuelReceipts, setFuelReceipts] = useState<FuelReceipt[]>([]);
  const [mileageLogs, setMileageLogs] = useState<MileageLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [quarter, setQuarter] = useState('');
  const [quarterlySummary, setQuarterlySummary] = useState<any>(null);
  const [fuelForm, setFuelForm] = useState<any>({
    file: null,
    upload_date: '',
    driver_truck_number: '',
    fuel_type: 'Diesel',
    gallons: '',
    cost_per_gallon: '',
    total_cost: '',
    location: '',
    vendor: ''
  });
  const [mileageForm, setMileageForm] = useState<any>({
    file: null,
    upload_date: '',
    truck_number: '',
    driver_name: '',
    start_odometer: '',
    end_odometer: '',
    total_miles: '',
    jurisdiction_miles: ''
  });
  const [fuelError, setFuelError] = useState('');
  const [mileageError, setMileageError] = useState('');
  const [fuelUploading, setFuelUploading] = useState(false);
  const [mileageUploading, setMileageUploading] = useState(false);
  const [filingId, setFilingId] = useState<string | null>(null);
  const [filingForm, setFilingForm] = useState<ComplianceRecord>({
    id: "",
    period: "",
    submission_date: "",
    filed_by: "",
    notes: "",
    return_copy_url: "",
    audit_log: "",
  });
  const [filingLoading, setFilingLoading] = useState(false);
  const [filingSaving, setFilingSaving] = useState(false);
  const [filingMessage, setFilingMessage] = useState("");
  const [returnCopyUploading, setReturnCopyUploading] = useState(false);

  function getQuarter(date: string): string {
    const d = new Date(date);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    if (month <= 3) return `Q1 ${year}`;
    if (month <= 6) return `Q2 ${year}`;
    if (month <= 9) return `Q3 ${year}`;
    return `Q4 ${year}`;
  }

  useEffect(() => {
    // Load fuel receipts and mileage logs
    async function loadData() {
      setLoading(true);
      try {
        // Load fuel receipts
        const { data: fuelData } = await supabase
          .from('fuel_receipts')
          .select('*')
          .order('upload_date', { ascending: false });
        if (fuelData) setFuelReceipts(fuelData as FuelReceipt[]);

        // Load mileage logs
        const { data: mileageData } = await supabase
          .from('mileage_logs')
          .select('*')
          .order('upload_date', { ascending: false });
        if (mileageData) setMileageLogs(mileageData as MileageLog[]);

        if (!quarter) {
          const quarters = Array.from(
            new Set(
              [...(fuelData || []), ...(mileageData || [])]
                .map((row: any) => getQuarter(row.upload_date))
                .filter(Boolean),
            ),
          )
            .sort()
            .reverse();
          if (quarters.length > 0) {
            setQuarter(quarters[0]);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!quarter || fuelReceipts.length === 0 && mileageLogs.length === 0) return;

    const filteredFuel = fuelReceipts.filter(f => getQuarter(f.upload_date) === quarter);
    const filteredMileage = mileageLogs.filter(m => getQuarter(m.upload_date) === quarter);

    const stateMiles: { [key: string]: number } = {};
    const stateGallons: { [key: string]: number } = {};
    const stateTax: { [key: string]: number } = {};

    filteredMileage.forEach(m => {
      const miles = m.jurisdiction_miles.split(',').reduce((acc, part) => {
        const [state, milesStr] = part.split(':').map(s => s.trim());
        if (state && milesStr) {
          acc[state] = (acc[state] || 0) + parseFloat(milesStr);
        }
        return acc;
      }, {} as { [key: string]: number });
      Object.keys(miles).forEach(state => {
        stateMiles[state] = (stateMiles[state] || 0) + miles[state];
      });
    });

    filteredFuel.forEach(f => {
      const state = f.location.split(',').pop()?.trim() || '';
      if (state) {
        stateGallons[state] = (stateGallons[state] || 0) + f.gallons;
      }
    });

    Object.keys(stateMiles).forEach(state => {
      const gallons = stateGallons[state] || 0;
      const miles = stateMiles[state] || 0;
      const rate = TAX_RATES[state] || 0;
      stateTax[state] = (miles / (gallons || 1)) * rate * gallons;
    });

    setQuarterlySummary({
      totalMiles: Object.values(stateMiles).reduce((sum, m) => sum + m, 0),
      totalGallons: Object.values(stateGallons).reduce((sum, g) => sum + g, 0),
      avgMPG: Object.values(stateMiles).reduce((sum, m) => sum + m, 0) / (Object.values(stateGallons).reduce((sum, g) => sum + g, 0) || 1),
      stateMiles,
      stateGallons,
      stateTax
    });
  }, [quarter, fuelReceipts, mileageLogs]);

  const quarterFuelReceipts = useMemo(
    () =>
      quarter
        ? fuelReceipts.filter((receipt) => getQuarter(receipt.upload_date) === quarter)
        : [],
    [quarter, fuelReceipts],
  );

  const quarterMileageLogs = useMemo(
    () =>
      quarter
        ? mileageLogs.filter((log) => getQuarter(log.upload_date) === quarter)
        : [],
    [quarter, mileageLogs],
  );

  function parseQuarter(period: string) {
    const match = period.match(/Q([1-4])\s+(\d{4})/i);
    if (!match) return null;
    return { quarter: Number(match[1]), year: Number(match[2]) };
  }

  const dueDateInfo = useMemo(() => {
    const parsed = quarter ? parseQuarter(quarter) : null;
    if (!parsed) return null;
    const { quarter: q, year } = parsed;
    const dueMonth =
      q === 1 ? 3 : q === 2 ? 6 : q === 3 ? 9 : 0;
    const dueYear = q === 4 ? year + 1 : year;
    const dueDate = new Date(dueYear, dueMonth + 1, 0);
    const daysUntil = Math.ceil(
      (dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
    );
    return { dueDate, daysUntil };
  }, [quarter]);

  const mpgByTruck = useMemo(() => {
    const totals = new Map<
      string,
      { miles: number; gallons: number }
    >();

    quarterMileageLogs.forEach((log) => {
      const key = log.truck_number || "Unknown";
      const entry = totals.get(key) || { miles: 0, gallons: 0 };
      entry.miles += Number(log.total_miles || 0);
      totals.set(key, entry);
    });

    quarterFuelReceipts.forEach((receipt) => {
      const key = receipt.driver_truck_number || "Unknown";
      const entry = totals.get(key) || { miles: 0, gallons: 0 };
      entry.gallons += Number(receipt.gallons || 0);
      totals.set(key, entry);
    });

    return Array.from(totals.entries())
      .map(([truck, data]) => ({
        truck,
        miles: data.miles,
        gallons: data.gallons,
        mpg:
          data.gallons > 0
            ? Number((data.miles / data.gallons).toFixed(2))
            : 0,
      }))
      .sort((a, b) => b.mpg - a.mpg)
      .slice(0, 8);
  }, [quarterFuelReceipts, quarterMileageLogs]);

  const dataIssues = useMemo(() => {
    const issues: { label: string; count: number }[] = [];

    const missingFuelFiles = quarterFuelReceipts.filter(
      (receipt) => !receipt.file_url,
    ).length;
    const missingMileageFiles = quarterMileageLogs.filter(
      (log) => !log.file_url,
    ).length;
    const missingJurisdiction = quarterMileageLogs.filter(
      (log) => !log.jurisdiction_miles,
    ).length;
    const missingVendor = quarterFuelReceipts.filter(
      (receipt) => !receipt.vendor,
    ).length;

    if (missingFuelFiles > 0)
      issues.push({ label: "Fuel receipts missing files", count: missingFuelFiles });
    if (missingMileageFiles > 0)
      issues.push({
        label: "Mileage logs missing files",
        count: missingMileageFiles,
      });
    if (missingJurisdiction > 0)
      issues.push({
        label: "Mileage logs missing jurisdiction miles",
        count: missingJurisdiction,
      });
    if (missingVendor > 0)
      issues.push({
        label: "Fuel receipts missing vendor info",
        count: missingVendor,
      });

    return issues;
  }, [quarterFuelReceipts, quarterMileageLogs]);

  useEffect(() => {
    if (!quarter) return;
    const parsed = parseQuarter(quarter);
    if (!parsed) return;

    async function loadFiling() {
      setFilingLoading(true);
      setFilingMessage("");
      try {
        const { data, error } = await supabase
          .from("ifta_quarter_filings")
          .select("*")
          .eq("year", parsed.year)
          .eq("quarter", parsed.quarter)
          .order("prepared_at", { ascending: false })
          .limit(1);

        if (error) {
          throw error;
        }

        const filing = data?.[0];
        if (filing) {
          const summary = filing.summary_json || {};
          setFilingId(filing.id);
          setFilingForm({
            id: filing.id,
            period: quarter,
            submission_date:
              summary.submission_date ||
              (filing.filed_at
                ? new Date(filing.filed_at).toISOString().slice(0, 10)
                : ""),
            filed_by: summary.filed_by || "",
            notes: summary.notes || "",
            return_copy_url: filing.pdf_url || summary.return_copy_url || "",
            audit_log: summary.audit_log || "",
          });
        } else {
          setFilingId(null);
          setFilingForm((prev) => ({
            ...prev,
            period: quarter,
          }));
        }
      } catch (error: any) {
        console.error("Error loading IFTA filing:", error);
        setFilingId(null);
        setFilingMessage("Unable to load filing records.");
      } finally {
        setFilingLoading(false);
      }
    }

    loadFiling();
  }, [quarter]);

  async function handleReturnCopyUpload(file: File) {
    if (!file) return;
    setReturnCopyUploading(true);
    setFilingMessage("");
    try {
      const timestamp = Date.now();
      const filePath = `ifta/filings/${timestamp}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("company_assets")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: urlData } = supabase.storage
        .from("company_assets")
        .getPublicUrl(filePath);

      setFilingForm((prev) => ({
        ...prev,
        return_copy_url: urlData.publicUrl,
      }));
    } catch (error: any) {
      console.error("Error uploading return copy:", error);
      setFilingMessage("Unable to upload IFTA return copy.");
    } finally {
      setReturnCopyUploading(false);
    }
  }

  async function handleSaveFiling() {
    if (!quarter) return;
    const parsed = parseQuarter(quarter);
    if (!parsed) return;

    setFilingSaving(true);
    setFilingMessage("");

    const summaryJson = {
      submission_date: filingForm.submission_date,
      filed_by: filingForm.filed_by,
      notes: filingForm.notes,
      return_copy_url: filingForm.return_copy_url,
      audit_log: filingForm.audit_log,
      totals: quarterlySummary || null,
      generated_at: new Date().toISOString(),
    };

    try {
      if (filingId) {
        const { error } = await supabase
          .from("ifta_quarter_filings")
          .update({
            status: "Draft",
            summary_json: summaryJson,
            pdf_url: filingForm.return_copy_url || null,
            filed_at: filingForm.submission_date || null,
            prepared_at: new Date().toISOString(),
          })
          .eq("id", filingId);

        if (error) {
          throw error;
        }
      } else {
        const { data, error } = await supabase
          .from("ifta_quarter_filings")
          .insert({
            year: parsed.year,
            quarter: parsed.quarter,
            status: "Draft",
            summary_json: summaryJson,
            pdf_url: filingForm.return_copy_url || null,
            filed_at: filingForm.submission_date || null,
            prepared_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        setFilingId(data?.id || null);
      }

      setFilingMessage("Filing saved successfully.");
      setFilingForm((prev) => ({
        ...prev,
        audit_log: prev.audit_log
          ? `${prev.audit_log}\nSaved on ${new Date().toLocaleString()}`
          : `Saved on ${new Date().toLocaleString()}`,
      }));
    } catch (error: any) {
      console.error("Error saving filing:", error);
      setFilingMessage(error.message || "Unable to save filing.");
    } finally {
      setFilingSaving(false);
    }
  }

  function downloadSummaryCsv() {
    if (!quarterlySummary) return;
    const header = [
      "State",
      "Miles",
      "Gallons",
      "MPG",
      "Tax Rate",
      "Tax Due",
    ];
    const rows = Object.keys(quarterlySummary.stateMiles || {}).map((state) => {
      const miles = quarterlySummary.stateMiles[state] || 0;
      const gallons = quarterlySummary.stateGallons[state] || 0;
      const mpg = gallons > 0 ? (miles / gallons).toFixed(2) : "0";
      const rate = TAX_RATES[state] ?? 0;
      const tax = quarterlySummary.stateTax[state] ?? 0;
      return [state, miles, gallons, mpg, rate, tax];
    });

    const csv = [header, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ifta-summary-${quarter || "latest"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadSummaryPdf() {
    if (!quarterlySummary) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`IFTA Summary ${quarter}`, 14, 20);
    doc.setFontSize(10);
    doc.text(
      `Total Miles: ${quarterlySummary.totalMiles}`,
      14,
      32,
    );
    doc.text(
      `Total Gallons: ${quarterlySummary.totalGallons}`,
      14,
      38,
    );
    doc.text(
      `Average MPG: ${quarterlySummary.avgMPG?.toFixed(2) || "--"}`,
      14,
      44,
    );

    let y = 56;
    doc.text("State Summary", 14, y);
    y += 6;
    Object.keys(quarterlySummary.stateMiles || {}).forEach((state) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const miles = quarterlySummary.stateMiles[state] || 0;
      const gallons = quarterlySummary.stateGallons[state] || 0;
      const tax = quarterlySummary.stateTax[state] || 0;
      doc.text(
        `${state}: ${miles} miles, ${gallons.toFixed(2)} gal, $${tax.toFixed(2)} tax`,
        14,
        y,
      );
      y += 6;
    });

    doc.save(`ifta-summary-${quarter || "latest"}.pdf`);
  }

  async function handleFuelReceiptUpload(e: React.FormEvent) {
    e.preventDefault();
    setFuelUploading(true);
    setFuelError('');
    try {
      if (!fuelForm.file) {
        setFuelError('Please select a file to upload');
        return;
      }

      // Upload file to Supabase Storage
      const timestamp = Date.now();
      const filePath = `ifta/fuel-receipts/${timestamp}_${fuelForm.file.name}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('company_assets')
        .upload(filePath, fuelForm.file, {
          cacheControl: '3600',
          upsert: false,
          contentType: fuelForm.file.type,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('company_assets')
        .getPublicUrl(filePath);

      // Save to database
      const { error: dbError } = await supabase
        .from('fuel_receipts')
        .insert({
          upload_date: fuelForm.upload_date || new Date().toISOString().split('T')[0],
          driver_truck_number: fuelForm.driver_truck_number,
          fuel_type: fuelForm.fuel_type,
          gallons: parseFloat(fuelForm.gallons) || 0,
          cost_per_gallon: parseFloat(fuelForm.cost_per_gallon) || 0,
          total_cost: parseFloat(fuelForm.total_cost) || 0,
          location: fuelForm.location,
          vendor: fuelForm.vendor,
          file_url: urlData.publicUrl
        });

      if (dbError) {
        throw new Error(dbError.message);
      }

      // Reload data
      const { data: fuelData } = await supabase.from('fuel_receipts').select('*').order('upload_date', { ascending: false });
      if (fuelData) setFuelReceipts(fuelData as FuelReceipt[]);

      // Reset form
      setFuelForm({
        file: null,
        upload_date: '',
        driver_truck_number: '',
        fuel_type: 'Diesel',
        gallons: '',
        cost_per_gallon: '',
        total_cost: '',
        location: '',
        vendor: ''
      });
    } catch (error: any) {
      setFuelError(error.message || 'Error uploading fuel receipt');
    } finally {
      setFuelUploading(false);
    }
  }

  async function handleMileageLogUpload(e: React.FormEvent) {
    e.preventDefault();
    setMileageUploading(true);
    setMileageError('');
    try {
      if (!mileageForm.file) {
        setMileageError('Please select a file to upload');
        return;
      }

      // Upload file to Supabase Storage
      const timestamp = Date.now();
      const filePath = `ifta/mileage-logs/${timestamp}_${mileageForm.file.name}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('company_assets')
        .upload(filePath, mileageForm.file, {
          cacheControl: '3600',
          upsert: false,
          contentType: mileageForm.file.type,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('company_assets')
        .getPublicUrl(filePath);

      // Save to database
      const { error: dbError } = await supabase
        .from('mileage_logs')
        .insert({
          upload_date: mileageForm.upload_date || new Date().toISOString().split('T')[0],
          truck_number: mileageForm.truck_number,
          driver_name: mileageForm.driver_name,
          start_odometer: parseFloat(mileageForm.start_odometer) || 0,
          end_odometer: parseFloat(mileageForm.end_odometer) || 0,
          total_miles: parseFloat(mileageForm.total_miles) || 0,
          jurisdiction_miles: mileageForm.jurisdiction_miles,
          file_url: urlData.publicUrl
        });

      if (dbError) {
        throw new Error(dbError.message);
      }

      // Reload data
      const { data: mileageData } = await supabase.from('mileage_logs').select('*').order('upload_date', { ascending: false });
      if (mileageData) setMileageLogs(mileageData as MileageLog[]);

      // Reset form
      setMileageForm({
        file: null,
        upload_date: '',
        truck_number: '',
        driver_name: '',
        start_odometer: '',
        end_odometer: '',
        total_miles: '',
        jurisdiction_miles: ''
      });
    } catch (error: any) {
      setMileageError(error.message || 'Error uploading mileage log');
    } finally {
      setMileageUploading(false);
    }
  }

  return (
    <div className="p-6">
      {/* 1. Quarterly Summary */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">Quarterly Summary</h2>
        {loading || !quarterlySummary ? (
          <div>Loading...</div>
        ) : (
          <>
            <div className="mb-2">
              <label className="mr-2">Quarter:</label>
              <select value={quarter} onChange={e => setQuarter(e.target.value)} className="border rounded px-2 py-1">
                {Array.from(new Set([
                  ...fuelReceipts.map(f => getQuarter(f.upload_date)),
                  ...mileageLogs.map(m => getQuarter(m.upload_date)),
                ].filter(Boolean))).sort().reverse().map(q => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white rounded shadow p-4">Total Miles Driven<br /><span className="font-bold text-lg">{quarterlySummary.totalMiles}</span></div>
              <div className="bg-white rounded shadow p-4">Total Fuel Purchased (Gallons)<br /><span className="font-bold text-lg">{quarterlySummary.totalGallons}</span></div>
              <div className="bg-white rounded shadow p-4">Average MPG<br /><span className="font-bold text-lg">{quarterlySummary.avgMPG ? quarterlySummary.avgMPG.toFixed(2) : '--'}</span></div>
              <div className="bg-white rounded shadow p-4">IFTA Taxable Miles<br /><span className="font-bold text-lg">{quarterlySummary.totalMiles}</span></div>
              <div className="bg-white rounded shadow p-4">Fuel Tax Owed / Credit<br /><span className="font-bold text-lg">${Object.values(quarterlySummary.stateTax).reduce((sum, v) => (sum as number) + (v as number), 0).toFixed(2)}</span></div>
              <div className="bg-white rounded shadow p-4">Report Status<br /><span className="font-bold text-lg">Draft</span></div>
            </div>
          </>
        )}
        <a href="https://comptroller.texas.gov/taxes/ifta/" target="_blank" rel="noopener" className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">File Online → Texas IFTA Portal</a>
      </section>

      {/* 2. Upload Sections */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">Upload Fuel Receipts</h2>
        <form className="bg-white rounded shadow p-4 mb-6" onSubmit={handleFuelReceiptUpload}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">Upload Fuel Receipt (PDF/Image)</label>
              <input type="file" accept="application/pdf,image/*" className="mb-2" onChange={e => setFuelForm(f => ({ ...f, file: e.target.files?.[0] || null }))} />
            </div>
            <div>
              <label className="block mb-1">Upload Date</label>
              <input type="date" className="w-full border rounded px-2 py-1" value={fuelForm.upload_date} onChange={e => setFuelForm(f => ({ ...f, upload_date: e.target.value }))} />
            </div>
            <div>
              <label className="block mb-1">Driver / Truck Number</label>
              <input type="text" className="w-full border rounded px-2 py-1" value={fuelForm.driver_truck_number} onChange={e => setFuelForm(f => ({ ...f, driver_truck_number: e.target.value }))} />
            </div>
            <div>
              <label className="block mb-1">Fuel Type</label>
              <select className="w-full border rounded px-2 py-1" value={fuelForm.fuel_type} onChange={e => setFuelForm(f => ({ ...f, fuel_type: e.target.value }))}>
                <option>Diesel</option>
                <option>Gasoline</option>
                <option>DEF</option>
              </select>
            </div>
            <div>
              <label className="block mb-1">Gallons Purchased</label>
              <input type="number" step="0.01" className="w-full border rounded px-2 py-1" value={fuelForm.gallons} onChange={e => setFuelForm(f => ({ ...f, gallons: e.target.value }))} />
            </div>
            <div>
              <label className="block mb-1">Cost per Gallon ($)</label>
              <input type="number" step="0.01" className="w-full border rounded px-2 py-1" value={fuelForm.cost_per_gallon} onChange={e => setFuelForm(f => ({ ...f, cost_per_gallon: e.target.value }))} />
            </div>
            <div>
              <label className="block mb-1">Total Fuel Cost ($)</label>
              <input type="number" step="0.01" className="w-full border rounded px-2 py-1" value={fuelForm.total_cost} onChange={e => setFuelForm(f => ({ ...f, total_cost: e.target.value }))} />
            </div>
            <div>
              <label className="block mb-1">Purchase Location (City, State)</label>
              <input type="text" className="w-full border rounded px-2 py-1" value={fuelForm.location} onChange={e => setFuelForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div>
              <label className="block mb-1">Fuel Vendor Name</label>
              <input type="text" className="w-full border rounded px-2 py-1" value={fuelForm.vendor} onChange={e => setFuelForm(f => ({ ...f, vendor: e.target.value }))} />
            </div>
          </div>
          {fuelError && <div className="text-red-600 mt-2">{fuelError}</div>}
          <button type="submit" className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700" disabled={fuelUploading}>{fuelUploading ? 'Uploading...' : 'Upload Fuel Receipts'}</button>
        </form>
        {/* List uploaded fuel receipts */}
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Uploaded Fuel Receipts</h3>
          {fuelReceipts.length === 0 ? <div className="text-gray-500">No receipts uploaded.</div> : (
            <ul className="divide-y">
              {fuelReceipts.map(r => (
                <li key={r.id} className="py-2 flex flex-col md:flex-row md:items-center md:gap-4">
                  <a href={r.file_url} target="_blank" rel="noopener" className="text-blue-600 underline">View</a>
                  <span className="ml-2">{r.upload_date} | {r.driver_truck_number} | {r.fuel_type} | {r.gallons} gal | ${r.total_cost} | {r.location} | {r.vendor}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Mileage Logs Upload */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">Upload Mileage Logs</h2>
        <form className="bg-white rounded shadow p-4 mb-6" onSubmit={handleMileageLogUpload}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">Upload Mileage Logs File (CSV, Excel, PDF)</label>
              <input type="file" accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf" className="mb-2" onChange={e => setMileageForm(f => ({ ...f, file: e.target.files?.[0] || null }))} />
            </div>
            <div>
              <label className="block mb-1">Upload Date</label>
              <input type="date" className="w-full border rounded px-2 py-1" value={mileageForm.upload_date} onChange={e => setMileageForm(f => ({ ...f, upload_date: e.target.value }))} />
            </div>
            <div>
              <label className="block mb-1">Truck Number</label>
              <input type="text" className="w-full border rounded px-2 py-1" value={mileageForm.truck_number} onChange={e => setMileageForm(f => ({ ...f, truck_number: e.target.value }))} />
            </div>
            <div>
              <label className="block mb-1">Driver Name</label>
              <input type="text" className="w-full border rounded px-2 py-1" value={mileageForm.driver_name} onChange={e => setMileageForm(f => ({ ...f, driver_name: e.target.value }))} />
            </div>
            <div>
              <label className="block mb-1">Start Odometer</label>
              <input type="number" className="w-full border rounded px-2 py-1" value={mileageForm.start_odometer} onChange={e => setMileageForm(f => ({ ...f, start_odometer: e.target.value }))} />
            </div>
            <div>
              <label className="block mb-1">End Odometer</label>
              <input type="number" className="w-full border rounded px-2 py-1" value={mileageForm.end_odometer} onChange={e => setMileageForm(f => ({ ...f, end_odometer: e.target.value }))} />
            </div>
            <div>
              <label className="block mb-1">Total Miles Driven</label>
              <input type="number" className="w-full border rounded px-2 py-1" value={mileageForm.total_miles} onChange={e => setMileageForm(f => ({ ...f, total_miles: e.target.value }))} />
            </div>
            <div>
              <label className="block mb-1">Jurisdiction Miles (State-by-State)</label>
              <input type="text" placeholder="e.g. TX: 500, OK: 200" className="w-full border rounded px-2 py-1" value={mileageForm.jurisdiction_miles} onChange={e => setMileageForm(f => ({ ...f, jurisdiction_miles: e.target.value }))} />
            </div>
          </div>
          {mileageError && <div className="text-red-600 mt-2">{mileageError}</div>}
          <button type="submit" className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700" disabled={mileageUploading}>{mileageUploading ? 'Uploading...' : 'Upload Mileage Logs File'}</button>
        </form>
        {/* List uploaded mileage logs */}
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Uploaded Mileage Logs</h3>
          {mileageLogs.length === 0 ? <div className="text-gray-500">No logs uploaded.</div> : (
            <ul className="divide-y">
              {mileageLogs.map(r => (
                <li key={r.id} className="py-2 flex flex-col md:flex-row md:items-center md:gap-4">
                  <a href={r.file_url} target="_blank" rel="noopener" className="text-blue-600 underline">View</a>
                  <span className="ml-2">{r.upload_date} | {r.truck_number} | {r.driver_name} | {r.total_miles} mi | {r.jurisdiction_miles}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 3. Calculations & Summaries */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">Calculations & Summaries</h2>
        <div className="mb-4">MPG (Miles per Gallon) = <span className="font-bold">Total Miles ÷ Total Gallons</span></div>
        <div className="mb-4">Fuel Cost per Mile ($): <span className="font-bold">{quarterlySummary && quarterlySummary.totalMiles > 0 && fuelReceipts.length > 0 ? (fuelReceipts.reduce((sum, f) => sum + (f.total_cost || 0), 0) / quarterlySummary.totalMiles).toFixed(3) : '--'}</span></div>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded shadow">
            <thead>
              <tr>
                <th className="px-2 py-1">State</th>
                <th className="px-2 py-1">Miles</th>
                <th className="px-2 py-1">Gallons</th>
                <th className="px-2 py-1">MPG</th>
                <th className="px-2 py-1">Tax Rate</th>
                <th className="px-2 py-1">Tax Owed / Credit</th>
              </tr>
            </thead>
            <tbody>
              {quarterlySummary && Object.keys(quarterlySummary.stateMiles).length > 0 ? (
                Object.keys(quarterlySummary.stateMiles).map(state => (
                  <tr key={state}>
                    <td className="border px-2 py-1">{state}</td>
                    <td className="border px-2 py-1">{quarterlySummary.stateMiles[state]}</td>
                    <td className="border px-2 py-1">{quarterlySummary.stateGallons[state]?.toFixed(2)}</td>
                    <td className="border px-2 py-1">{quarterlySummary.stateGallons[state] > 0 ? (quarterlySummary.stateMiles[state] / quarterlySummary.stateGallons[state]).toFixed(2) : '--'}</td>
                    <td className="border px-2 py-1">${TAX_RATES[state] ? TAX_RATES[state].toFixed(3) : '--'}</td>
                    <td className="border px-2 py-1">${quarterlySummary.stateTax[state]?.toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="text-center">No state data for this quarter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-2">IFTA Total Owed / Refund Amount: <span className="font-bold">${quarterlySummary ? Object.values(quarterlySummary.stateTax).reduce((sum, v) => (sum as number) + (v as number), 0).toFixed(2) : '--'}</span></div>
      </section>

      {/* 4. Compliance Records */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">Compliance Records</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block mb-1">Quarterly Filing Period</label>
            <input
              type="text"
              className="w-full border rounded px-2 py-1"
              value={filingForm.period || quarter}
              onChange={(e) =>
                setFilingForm((prev) => ({ ...prev, period: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block mb-1">Submission Date / Confirmation #</label>
            <input
              type="date"
              className="w-full border rounded px-2 py-1"
              value={filingForm.submission_date}
              onChange={(e) =>
                setFilingForm((prev) => ({
                  ...prev,
                  submission_date: e.target.value,
                }))
              }
            />
          </div>
          <div>
            <label className="block mb-1">Filed By (Name / Email)</label>
            <input
              type="text"
              className="w-full border rounded px-2 py-1"
              value={filingForm.filed_by}
              onChange={(e) =>
                setFilingForm((prev) => ({ ...prev, filed_by: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block mb-1">Notes / Comments</label>
            <textarea
              className="w-full border rounded px-2 py-1"
              value={filingForm.notes}
              onChange={(e) =>
                setFilingForm((prev) => ({ ...prev, notes: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block mb-1">Upload IFTA Return Copy (PDF)</label>
            <input
              type="file"
              accept="application/pdf"
              className="mb-2"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleReturnCopyUpload(file);
                }
              }}
              disabled={returnCopyUploading}
            />
            {filingForm.return_copy_url && (
              <a
                href={filingForm.return_copy_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline text-sm"
              >
                View uploaded return copy
              </a>
            )}
          </div>
        </div>
        <div className="mb-2">
          <label className="block mb-1">Audit Log: Changes, Edits, or Adjustments</label>
          <textarea
            className="w-full border rounded px-2 py-1"
            rows={2}
            value={filingForm.audit_log}
            onChange={(e) =>
              setFilingForm((prev) => ({ ...prev, audit_log: e.target.value }))
            }
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSaveFiling}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
            disabled={filingSaving || filingLoading}
          >
            {filingSaving ? "Saving..." : "Save Filing Record"}
          </button>
          {filingMessage && (
            <span className="text-sm text-gray-600">{filingMessage}</span>
          )}
        </div>
      </section>

      {/* 5. Optional / Advanced Features */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">Advanced Features</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="font-semibold">Exports</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadSummaryCsv}
                className="bg-gray-900 text-white px-3 py-2 rounded"
              >
                Download CSV
              </button>
              <button
                type="button"
                onClick={downloadSummaryPdf}
                className="bg-gray-900 text-white px-3 py-2 rounded"
              >
                Download PDF
              </button>
              <a
                href="https://comptroller.texas.gov/taxes/ifta/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded border border-gray-300 text-gray-700"
              >
                Texas IFTA Portal
              </a>
            </div>
            {dueDateInfo && (
              <div className="text-sm text-gray-600">
                Next filing due:{" "}
                <span className="font-semibold">
                  {dueDateInfo.dueDate.toLocaleDateString()}
                </span>{" "}
                {dueDateInfo.daysUntil <= 30 ? (
                  <span className="text-red-600">
                    ({dueDateInfo.daysUntil} days remaining)
                  </span>
                ) : (
                  <span>({dueDateInfo.daysUntil} days remaining)</span>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="font-semibold">Data Quality Checks</div>
            {dataIssues.length === 0 ? (
              <div className="text-sm text-green-700">
                No missing data detected for this quarter.
              </div>
            ) : (
              <ul className="list-disc ml-5 text-sm text-red-700 space-y-1">
                {dataIssues.map((issue) => (
                  <li key={issue.label}>
                    {issue.label} ({issue.count})
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-6">
          <div className="font-semibold mb-2">Top MPG by Truck</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-1 text-left">Truck</th>
                  <th className="border px-2 py-1 text-left">Miles</th>
                  <th className="border px-2 py-1 text-left">Gallons</th>
                  <th className="border px-2 py-1 text-left">MPG</th>
                </tr>
              </thead>
              <tbody>
                {mpgByTruck.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-3 text-gray-400">
                      No MPG data available for this quarter.
                    </td>
                  </tr>
                ) : (
                  mpgByTruck.map((row) => (
                    <tr key={row.truck}>
                      <td className="border px-2 py-1">{row.truck}</td>
                      <td className="border px-2 py-1">{row.miles}</td>
                      <td className="border px-2 py-1">{row.gallons.toFixed(2)}</td>
                      <td className="border px-2 py-1">{row.mpg}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

export default IFTAReportsTab;
