import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import Link from "next/link";

export default function MaterialRateManagementTab() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Material & Rate Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage materials, rates, customers, jobs, trucking, and reporting
          </p>
        </div>
        <Button className="flex items-center gap-2">+ Add Material</Button>
      </div>

      {/* Material Information */}
      <Card>
        <CardHeader>
          <CardTitle>Material Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Material Type
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="e.g. Gravel, Sand, Limestone"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Material Code / ID
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="Unique code or ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Material Description
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="Description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Supplier / Source Location
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="Supplier or source"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Material Category
            </label>
            <select className="input input-bordered w-full">
              <option>Raw Material</option>
              <option>Processed</option>
              <option>Recycled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Stockpile Location or Yard
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="Yard or stockpile location"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Availability / Inventory
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="e.g. 1200 tons"
            />
          </div>
        </CardContent>
      </Card>

      {/* Rate Management */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Management</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Rate Type
            </label>
            <select className="input input-bordered w-full">
              <option>Per Ton</option>
              <option>Per Yard</option>
              <option>Per Load</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Base Rate
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="$10.50 per ton"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Fuel Surcharge
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Delivery Charge / Hauling Fee
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Minimum Load Charge
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Brokered Load %
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Customer-specific Rates
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="Override per account"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Effective Date Range
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="Start / End"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customer & Job Site Details */}
      <Card>
        <CardHeader>
          <CardTitle>Customer & Job Site Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Customer Name / Company
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="Customer or company"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Job Name / Project ID
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="Job or project"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Job Site Address
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="Address"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Contact Person & Number
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="Contact info"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Billing Account / Payment Terms
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="Billing or terms"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700">
              Notes / Special Instructions
            </label>
            <textarea
              className="input input-bordered w-full"
              placeholder="e.g. dump location, load requirements"
            />
          </div>
        </CardContent>
      </Card>

      {/* Trucking / Dispatch Info */}
      <Card>
        <CardHeader>
          <CardTitle>Trucking / Dispatch Info</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Truck Type
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="End dump, Belly dump, etc."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Truck Assigned
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="Truck ID or name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Driver Assigned
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="Driver name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Pickup Location / Scale Site
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="Pickup or scale site"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Delivery Location
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="Delivery location"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Hauling Distance
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="mi/km"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Estimated Load Time / Unload Time
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="Minutes"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Ticket or Scale Number
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="Ticket or scale number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tare, Gross, and Net Weight
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="e.g. 12,000 / 32,000 / 20,000 lbs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Reports & Tracking */}
      <Card>
        <CardHeader>
          <CardTitle>Reports & Tracking</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Daily Tonnage / Yardage Report
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="Auto-generated"
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Load Summary
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="By material, customer, or driver"
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Revenue by Material Type
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="Auto-generated"
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Rate History / Adjustments Log
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="Auto-generated"
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Profit per Load / Job / Material
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="Auto-generated"
              disabled
            />
          </div>
        </CardContent>
      </Card>

      {/* Optional Add-ons */}
      <Card>
        <CardHeader>
          <CardTitle>Optional Add-ons</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Digital Ticket Uploads
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="Photo or scan"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              GPS Tracking for Load Verification
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="Auto-captured"
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Signature Capture for Delivery Confirmation
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="Sign on device"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Automated Invoice Generation
            </label>
            <input
              className="input input-bordered w-full"
              placeholder="Based on tickets + rates"
              disabled
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
