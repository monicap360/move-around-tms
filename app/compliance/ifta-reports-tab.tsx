"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

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

const IFTAReportsTab = () => {
  // State for fetched data
  const [fuelReceipts, setFuelReceipts] = useState<FuelReceipt[]>([]);
  const [fuelForm, setFuelForm] = useState({
    file: null as File | null,
    upload_date: '',
    driver_truck_number: '',
    fuel_type: 'Diesel',
    gallons: '',
    cost_per_gallon: '',
    total_cost: '',
    location: '',
    vendor: '',
  });
  const [fuelUploading, setFuelUploading] = useState(false);
  const [fuelError, setFuelError] = useState('');
  const [mileageLogs, setMileageLogs] = useState<MileageLog[]>([]);
  const [complianceRecords, setComplianceRecords] = useState<ComplianceRecord[]>([]);
  const [mileageForm, setMileageForm] = useState({
    file: null as File | null,
    upload_date: '',
    truck_number: '',
    driver_name: '',
    start_odometer: '',
    end_odometer: '',
    total_miles: '',
    jurisdiction_miles: '',
  });
  const [mileageUploading, setMileageUploading] = useState(false);
  const [mileageError, setMileageError] = useState('');
  const [loading, setLoading] = useState(true);
  // Mileage log upload handler
  const handleMileageLogUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setMileageError('');
    setMileageUploading(true);
    try {
      if (!mileageForm.file) throw new Error('File required');
      const filePath = `mileage-logs/${Date.now()}-${mileageForm.file.name}`;
      const { error: uploadError } = await supabase.storage.from('ifta').upload(filePath, mileageForm.file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('ifta').getPublicUrl(filePath);
      const { error: insertError } = await supabase.from('ifta_mileage_logs').insert([
        {
          upload_date: mileageForm.upload_date,
          truck_number: mileageForm.truck_number,
          driver_name: mileageForm.driver_name,
          start_odometer: parseFloat(mileageForm.start_odometer),
          end_odometer: parseFloat(mileageForm.end_odometer),
          total_miles: parseFloat(mileageForm.total_miles),
          jurisdiction_miles: mileageForm.jurisdiction_miles,
          file_url: urlData?.publicUrl || '',
        },
      ]);
      if (insertError) throw insertError;
      const { data: mileageData } = await supabase
        .from('ifta_mileage_logs')
        .select('*')
        .order('upload_date', { ascending: false });
      setMileageLogs(mileageData || []);
      setMileageForm({
        file: null,
        upload_date: '',
        truck_number: '',
        driver_name: '',
        start_odometer: '',
        end_odometer: '',
        total_miles: '',
        jurisdiction_miles: '',
      });
    } catch (err: any) {
      setMileageError(err.message || 'Upload failed');
    } finally {
      setMileageUploading(false);
    }
  };

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Fetch fuel receipts
      const { data: fuelData } = await supabase
        .from('ifta_fuel_receipts')
        .select('*')
        .order('upload_date', { ascending: false });
      setFuelReceipts(fuelData || []);
      // Fetch mileage logs
      const { data: mileageData } = await supabase
        .from('ifta_mileage_logs')
        .select('*')
        .order('upload_date', { ascending: false });
      setMileageLogs(mileageData || []);
      // Fetch compliance records
      const { data: complianceData } = await supabase
        .from('ifta_compliance_records')
        .select('*')
        .order('period', { ascending: false });
      setComplianceRecords(complianceData || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Fuel receipt upload handler
  const handleFuelReceiptUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setFuelError('');
    setFuelUploading(true);
    try {
      if (!fuelForm.file) throw new Error('File required');
      // Upload file to Supabase Storage
      const filePath = `fuel-receipts/${Date.now()}-${fuelForm.file.name}`;
      const { error: uploadError } = await supabase.storage.from('ifta').upload(filePath, fuelForm.file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('ifta').getPublicUrl(filePath);
      // Insert metadata into table
      const { error: insertError } = await supabase.from('ifta_fuel_receipts').insert([
        {
          upload_date: fuelForm.upload_date,
          driver_truck_number: fuelForm.driver_truck_number,
          fuel_type: fuelForm.fuel_type,
          gallons: parseFloat(fuelForm.gallons),
          cost_per_gallon: parseFloat(fuelForm.cost_per_gallon),
          total_cost: parseFloat(fuelForm.total_cost),
          location: fuelForm.location,
          vendor: fuelForm.vendor,
          file_url: urlData?.publicUrl || '',
        },
      ]);
      if (insertError) throw insertError;
      // Refresh data
      const { data: fuelData } = await supabase
        .from('ifta_fuel_receipts')
        .select('*')
        .order('upload_date', { ascending: false });
      setFuelReceipts(fuelData || []);
      setFuelForm({
        file: null,
        upload_date: '',
        driver_truck_number: '',
        fuel_type: 'Diesel',
        gallons: '',
        cost_per_gallon: '',
        total_cost: '',
        location: '',
        vendor: '',
      });
    } catch (err: any) {
      setFuelError(err.message || 'Upload failed');
    } finally {
      setFuelUploading(false);
    }
  };

  // UI
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Compliance / IFTA Reports</h1>
      {/* 1. Overview Dashboard */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">Quarterly Summary</h2>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded shadow p-4">Total Miles Driven<br /><span className="font-bold text-lg">{mileageLogs.reduce((sum, m) => sum + (m.total_miles || 0), 0)}</span></div>
            <div className="bg-white rounded shadow p-4">Total Fuel Purchased (Gallons)<br /><span className="font-bold text-lg">{fuelReceipts.reduce((sum, f) => sum + (f.gallons || 0), 0)}</span></div>
            <div className="bg-white rounded shadow p-4">Average MPG<br /><span className="font-bold text-lg">{
              (() => {
                const miles = mileageLogs.reduce((sum, m) => sum + (m.total_miles || 0), 0);
                const gallons = fuelReceipts.reduce((sum, f) => sum + (f.gallons || 0), 0);
                return gallons > 0 ? (miles / gallons).toFixed(2) : '--';
              })()
            }</span></div>
            <div className="bg-white rounded shadow p-4">IFTA Taxable Miles<br /><span className="font-bold text-lg">{mileageLogs.reduce((sum, m) => sum + (m.total_miles || 0), 0)}</span></div>
            <div className="bg-white rounded shadow p-4">Fuel Tax Owed / Credit<br /><span className="font-bold text-lg">--</span></div>
            <div className="bg-white rounded shadow p-4">Report Status<br /><span className="font-bold text-lg">Draft</span></div>
          </div>
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
    </div>
  );
};

export default IFTAReportsTab;
// Duplicate function removed to fix syntax error

      {/* 2. Upload Sections */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">Upload Fuel Receipts</h2>
        <form className="bg-white rounded shadow p-4 mb-6" onSubmit={async (e) => {
          e.preventDefault();
          setFuelError('');
          setFuelUploading(true);
          try {
            if (!fuelForm.file) throw new Error('File required');
            // Upload file to Supabase Storage
            const fileExt = fuelForm.file.name.split('.').pop();
            const filePath = `fuel-receipts/${Date.now()}-${fuelForm.file.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage.from('ifta').upload(filePath, fuelForm.file);
            if (uploadError) throw uploadError;
            const { data: urlData } = supabase.storage.from('ifta').getPublicUrl(filePath);
            // Insert metadata into table
            const { error: insertError } = await supabase.from('ifta_fuel_receipts').insert([
              {
                upload_date: fuelForm.upload_date,
                driver_truck_number: fuelForm.driver_truck_number,
                fuel_type: fuelForm.fuel_type,
                gallons: parseFloat(fuelForm.gallons),
                cost_per_gallon: parseFloat(fuelForm.cost_per_gallon),
                total_cost: parseFloat(fuelForm.total_cost),
                location: fuelForm.location,
                vendor: fuelForm.vendor,
                file_url: urlData?.publicUrl || '',
              },
            ]);
            if (insertError) throw insertError;
            // Refresh data
            const { data: fuelData } = await supabase
              .from('ifta_fuel_receipts')
              .select('*')
              .order('upload_date', { ascending: false });
            setFuelReceipts(fuelData || []);
            setFuelForm({
              file: null,
              upload_date: '',
              driver_truck_number: '',
              fuel_type: 'Diesel',
              gallons: '',
              cost_per_gallon: '',
              total_cost: '',
              location: '',
              vendor: '',
            });
          } catch (err: any) {
            setFuelError(err.message || 'Upload failed');
          } finally {
            setFuelUploading(false);
          }
        }}>
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

        <h2 className="text-xl font-semibold mb-2">Upload Mileage Logs</h2>
        <form className="bg-white rounded shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">Upload Mileage Logs File (CSV, Excel, PDF)</label>
              <input type="file" accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf" className="mb-2" />
            </div>
            <div>
              <label className="block mb-1">Upload Date</label>
              <input type="date" className="w-full border rounded px-2 py-1" />
            </div>
            <div>
              <label className="block mb-1">Truck Number</label>
              <input type="text" className="w-full border rounded px-2 py-1" />
            </div>
            <div>
              <label className="block mb-1">Driver Name</label>
              <input type="text" className="w-full border rounded px-2 py-1" />
            </div>
            <div>
              <label className="block mb-1">Start Odometer</label>
              <input type="number" className="w-full border rounded px-2 py-1" />
            </div>
            <div>
              <label className="block mb-1">End Odometer</label>
              <input type="number" className="w-full border rounded px-2 py-1" />
            </div>
            <div>
              <label className="block mb-1">Total Miles Driven</label>
              <input type="number" className="w-full border rounded px-2 py-1" />
            </div>
            <div>
              <label className="block mb-1">Jurisdiction Miles (State-by-State)</label>
              <input type="text" placeholder="e.g. TX: 500, OK: 200" className="w-full border rounded px-2 py-1" />
            </div>
          </div>
          <button type="submit" className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Upload Mileage Logs File</button>
        </form>
      </section>

      {/* 3. Calculations & Summaries */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">Calculations & Summaries</h2>
        <div className="mb-4">MPG (Miles per Gallon) = <span className="font-bold">Total Miles ÷ Total Gallons</span></div>
        <div className="mb-4">Fuel Cost per Mile ($): <span className="font-bold">--</span></div>
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
              {/* Example row */}
              <tr>
                <td className="border px-2 py-1">TX</td>
                <td className="border px-2 py-1">--</td>
                <td className="border px-2 py-1">--</td>
                <td className="border px-2 py-1">--</td>
                <td className="border px-2 py-1">--</td>
                <td className="border px-2 py-1">--</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-2">IFTA Total Owed / Refund Amount: <span className="font-bold">--</span></div>
      </section>

      {/* 4. Compliance Records */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">Compliance Records</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block mb-1">Quarterly Filing Period</label>
            <input type="text" className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="block mb-1">Submission Date / Confirmation #</label>
            <input type="text" className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="block mb-1">Filed By (Name / Email)</label>
            <input type="text" className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="block mb-1">Notes / Comments</label>
            <textarea className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="block mb-1">Upload IFTA Return Copy (PDF)</label>
            <input type="file" accept="application/pdf" className="mb-2" />
          </div>
        </div>
        <div className="mb-2">
          <label className="block mb-1">Audit Log: Changes, Edits, or Adjustments</label>
          <textarea className="w-full border rounded px-2 py-1" rows={2} readOnly value="--" />
        </div>
      </section>

      {/* 5. Optional / Advanced Features */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">Advanced Features</h2>
        <ul className="list-disc ml-6 space-y-1">
          <li><a href="https://comptroller.texas.gov/taxes/ifta/" target="_blank" rel="noopener" className="text-blue-600 underline">Direct Link: Texas IFTA Portal</a></li>
          <li>Generate IFTA Report PDF / Excel Export (coming soon)</li>
          <li>Fuel Card Import (EFS, Comdata, WEX, etc.) (coming soon)</li>
          <li>Auto MPG Calculation per Truck or Driver (coming soon)</li>
          <li>Reminder Alerts (Quarterly IFTA due dates) (coming soon)</li>
          <li>Error Checker: Flags missing fuel receipts or mileage logs (coming soon)</li>
        </ul>
      </section>



    </div>
  );
}

export default IFTAReportsTab;
