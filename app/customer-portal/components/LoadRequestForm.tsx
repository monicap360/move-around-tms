"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
// import { Label } from "../../components/ui/label";
// import { Textarea } from "../../components/ui/textarea";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { MapPin, Package, Truck, DollarSign } from "lucide-react";

interface LoadRequestFormProps {
  onSubmit: (data: LoadRequestData) => void;
  onCancel: () => void;
}

interface LoadRequestData {
  origin: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  destination: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  pickupDate: string;
  deliveryDate?: string;
  commodity: string;
  weight: number;
  equipment: string;
  specialRequirements?: string;
}

// Simple components for demo
const Label = ({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) => (
  <label
    htmlFor={htmlFor}
    className="text-sm font-medium leading-none block mb-2"
  >
    {children}
  </label>
);

const Textarea = ({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className={`flex min-h-[80px] w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className || ""}`}
    {...props}
  />
);

const Select = ({
  children,
  value,
  onValueChange,
}: {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
}) => (
  <select
    value={value}
    onChange={(e) => onValueChange?.(e.target.value)}
    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    {children}
  </select>
);

export default function LoadRequestForm({
  onSubmit,
  onCancel,
}: LoadRequestFormProps) {
  const [formData, setFormData] = useState<LoadRequestData>({
    origin: {
      address: "",
      city: "",
      state: "",
      zipCode: "",
    },
    destination: {
      address: "",
      city: "",
      state: "",
      zipCode: "",
    },
    pickupDate: "",
    deliveryDate: "",
    commodity: "",
    weight: 0,
    equipment: "",
    specialRequirements: "",
  });

  const [pickupDate, setPickupDate] = useState<string>("");
  const [deliveryDate, setDeliveryDate] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = {
      ...formData,
      pickupDate: pickupDate,
      deliveryDate: deliveryDate,
    };

    onSubmit(submitData);
  };

  const updateOrigin = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      origin: { ...prev.origin, [field]: value },
    }));
  };

  const updateDestination = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      destination: { ...prev.destination, [field]: value },
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Request New Load</h2>
          <p className="text-gray-600">
            Fill out the details for your shipment request
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Origin Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-green-500" />
                Pickup Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="origin-address">Street Address</Label>
                  <Input
                    id="origin-address"
                    value={formData.origin.address}
                    onChange={(e) => updateOrigin("address", e.target.value)}
                    placeholder="1234 Industrial Blvd"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="origin-city">City</Label>
                  <Input
                    id="origin-city"
                    value={formData.origin.city}
                    onChange={(e) => updateOrigin("city", e.target.value)}
                    placeholder="Houston"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="origin-state">State</Label>
                  <Input
                    id="origin-state"
                    value={formData.origin.state}
                    onChange={(e) => updateOrigin("state", e.target.value)}
                    placeholder="TX"
                    maxLength={2}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="origin-zip">ZIP Code</Label>
                  <Input
                    id="origin-zip"
                    value={formData.origin.zipCode}
                    onChange={(e) => updateOrigin("zipCode", e.target.value)}
                    placeholder="77001"
                    maxLength={10}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Destination Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-red-500" />
                Delivery Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="dest-address">Street Address</Label>
                  <Input
                    id="dest-address"
                    value={formData.destination.address}
                    onChange={(e) =>
                      updateDestination("address", e.target.value)
                    }
                    placeholder="5678 Commerce St"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dest-city">City</Label>
                  <Input
                    id="dest-city"
                    value={formData.destination.city}
                    onChange={(e) => updateDestination("city", e.target.value)}
                    placeholder="Atlanta"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dest-state">State</Label>
                  <Input
                    id="dest-state"
                    value={formData.destination.state}
                    onChange={(e) => updateDestination("state", e.target.value)}
                    placeholder="GA"
                    maxLength={2}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dest-zip">ZIP Code</Label>
                  <Input
                    id="dest-zip"
                    value={formData.destination.zipCode}
                    onChange={(e) =>
                      updateDestination("zipCode", e.target.value)
                    }
                    placeholder="30301"
                    maxLength={10}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-500" />
                Shipment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pickup-date">Pickup Date</Label>
                  <Input
                    id="pickup-date"
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="delivery-date">
                    Delivery Date (Optional)
                  </Label>
                  <Input
                    id="delivery-date"
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    min={pickupDate || new Date().toISOString().split("T")[0]}
                  />
                </div>

                <div>
                  <Label htmlFor="commodity">Commodity</Label>
                  <Input
                    id="commodity"
                    value={formData.commodity}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        commodity: e.target.value,
                      }))
                    }
                    placeholder="Electronics Equipment"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="weight">Weight (lbs)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={formData.weight || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        weight: parseInt(e.target.value) || 0,
                      }))
                    }
                    placeholder="45000"
                    min="0"
                    max="80000"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="equipment">Equipment Type</Label>
                  <Select
                    value={formData.equipment}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, equipment: value }))
                    }
                  >
                    <option value="">Select equipment type</option>
                    <option value="van">Dry Van</option>
                    <option value="flatbed">Flatbed</option>
                    <option value="reefer">Refrigerated</option>
                    <option value="tanker">Tanker</option>
                    <option value="stepdeck">Step Deck</option>
                    <option value="lowboy">Lowboy</option>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="special-requirements">
                  Special Requirements (Optional)
                </Label>
                <Textarea
                  id="special-requirements"
                  value={formData.specialRequirements}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      specialRequirements: e.target.value,
                    }))
                  }
                  placeholder="Any special handling, permits, or requirements..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">Submit Load Request</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
