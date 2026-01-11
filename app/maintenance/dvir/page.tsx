"use client";
import { useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "../../components/ui/card";

const inspectionItems = [
  [
    { label: "Brakes (service)", key: "brakes" },
    { label: "Lights (head/stop/turn)", key: "lights" },
  ],
  [
    { label: "Parking Brake", key: "parking_brake" },
    { label: "Reflectors", key: "reflectors" },
  ],
  [
    { label: "Steering", key: "steering" },
    { label: "Horn", key: "horn" },
  ],
  [
    { label: "Tires/Wheels", key: "tires" },
    { label: "Windshield Wipers", key: "wipers" },
  ],
  [
    { label: "Mirrors", key: "mirrors" },
    { label: "Coupling Devices", key: "coupling" },
  ],
  [
    { label: "Suspension", key: "suspension" },
    { label: "Emergency Equipment", key: "emergency_equipment" },
  ],
  [
    { label: "Fuel System", key: "fuel_system" },
    { label: "Exhaust System", key: "exhaust_system" },
  ],
  [
    { label: "Oil/Fluid Levels", key: "oil_fluid" },
    { label: "Battery", key: "battery" },
  ],
  [
    { label: "Frame & Body", key: "frame_body" },
    { label: "Other", key: "other" },
  ],
];

export default function DVIRForm() {
  const [form, setForm] = useState({
    company: "",
    date: "",
    truckNumber: "",
    trailerNumber: "",
    odometer: "",
    driverName: "",
    driverSignature: "",
    inspection: {},
    remarks: "",
    mechanicName: "",
    repairDate: "",
    mechanicSignature: "",
    driverReview: "",
    driverReviewSignature: "",
    driverReviewDate: "",
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleInspection = (key, status) => {
    setForm((prev) => ({
      ...prev,
      inspection: {
        ...prev.inspection,
        [key]: status,
      },
    }));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    // Prepare inspection_items array for API
    const inspection_items = Object.entries(form.inspection).map(([key, status]) => ({
      item: key,
      status: status === "ok" ? "satisfactory" : status === "defect" ? "defective" : "unknown"
    }));

    const payload = {
      driver_name: form.driverName,
      truck_number: form.truckNumber,
      odometer_reading: form.odometer,
      inspection_type: "pre-trip", // or allow user to select
      location: "", // Optionally add location capture
      inspection_items,
      overall_status: inspection_items.some(i => i.status === "defective") ? "defective" : "satisfactory",
      remarks: form.remarks,
      trailer_number: form.trailerNumber,
      company: form.company,
      date: form.date,
      driver_signature: form.driverSignature,
      mechanic_name: form.mechanicName,
      repair_date: form.repairDate,
      mechanic_signature: form.mechanicSignature,
      driver_review: form.driverReview,
      driver_review_signature: form.driverReviewSignature,
      driver_review_date: form.driverReviewDate
    };

    try {
      const res = await fetch("/api/dvir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        alert("DVIR submitted successfully!");
        setForm({
          company: "",
          date: "",
          truckNumber: "",
          trailerNumber: "",
          odometer: "",
          driverName: "",
          driverSignature: "",
          inspection: {},
          remarks: "",
          mechanicName: "",
          repairDate: "",
          mechanicSignature: "",
          driverReview: "",
          driverReviewSignature: "",
          driverReviewDate: "",
        });
      } else {
        alert("Error submitting DVIR: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Network error submitting DVIR");
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Card className="shadow-lg border border-gray-200 bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-t-lg">
          <CardTitle>Driver Vehicle Inspection Report (DVIR)</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-700 mt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label>Company Name</label>
                <input name="company" value={form.company} onChange={handleChange} className="input" required />
              </div>
              <div>
                <label>Date</label>
                <input name="date" type="date" value={form.date} onChange={handleChange} className="input" required />
              </div>
              <div>
                <label>Truck/Tractor Number</label>
                <input name="truckNumber" value={form.truckNumber} onChange={handleChange} className="input" required />
              </div>
              <div>
                <label>Trailer Number(s)</label>
                <input name="trailerNumber" value={form.trailerNumber} onChange={handleChange} className="input" />
              </div>
              <div>
                <label>Odometer Reading</label>
                <input name="odometer" value={form.odometer} onChange={handleChange} className="input" required />
              </div>
              <div>
                <label>Driver Name</label>
                <input name="driverName" value={form.driverName} onChange={handleChange} className="input" required />
              </div>
              <div>
                <label>Driver Signature</label>
                <input name="driverSignature" value={form.driverSignature} onChange={handleChange} className="input" required />
              </div>
            </div>
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Vehicle Inspection Items</h3>
              <div className="grid grid-cols-2 gap-4">
                {inspectionItems.map((row, i) => (
                  <div key={i} className="flex gap-8">
                    {row.map((item) => (
                      <div key={item.key} className="flex flex-col">
                        <span>{item.label}</span>
                        <div className="flex gap-2 mt-1">
                          <label>
                            <input
                              type="radio"
                              name={`inspection_${item.key}`}
                              checked={form.inspection[item.key] === "ok"}
                              onChange={() => handleInspection(item.key, "ok")}
                            />
                            OK
                          </label>
                          <label>
                            <input
                              type="radio"
                              name={`inspection_${item.key}`}
                              checked={form.inspection[item.key] === "defect"}
                              onChange={() => handleInspection(item.key, "defect")}
                            />
                            Defect
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label>Remarks / Defects Found</label>
              <textarea name="remarks" value={form.remarks} onChange={handleChange} className="input" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label>Mechanic/Technician Name</label>
                <input name="mechanicName" value={form.mechanicName} onChange={handleChange} className="input" />
              </div>
              <div>
                <label>Date Repairs Made</label>
                <input name="repairDate" type="date" value={form.repairDate} onChange={handleChange} className="input" />
              </div>
              <div>
                <label>Mechanic Signature</label>
                <input name="mechanicSignature" value={form.mechanicSignature} onChange={handleChange} className="input" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Driver Review</h3>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="driverReview"
                  checked={form.driverReview === "corrected"}
                  onChange={() => setForm((prev) => ({ ...prev, driverReview: "corrected" }))}
                />
                I certify that any listed defects have been corrected.
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="driverReview"
                  checked={form.driverReview === "none"}
                  onChange={() => setForm((prev) => ({ ...prev, driverReview: "none" }))}
                />
                I certify that no defects were found.
              </label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <label>Driver Signature</label>
                  <input name="driverReviewSignature" value={form.driverReviewSignature} onChange={handleChange} className="input" />
                </div>
                <div>
                  <label>Date</label>
                  <input name="driverReviewDate" type="date" value={form.driverReviewDate} onChange={handleChange} className="input" />
                </div>
              </div>
            </div>
            <button type="submit" className="mt-6 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Submit DVIR</button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Add styles for .input in your global CSS or Tailwind config for consistent look
