"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Save, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  Car,
  Shield,
  Heart,
  Briefcase,
  Award
} from "lucide-react";

export default function NewDriverPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Personal Information
    name: "",
    employee_id: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    date_of_birth: "",
    
    // Employment Information
    hire_date: new Date().toISOString().split('T')[0],
    status: "Active",
    position: "",
    department: "",
    supervisor: "",
    years_experience: "",
    pay_rate: "",
    pay_type: "mileage",
    
    // CDL Information
    cdl_number: "",
    cdl_class: "A",
    cdl_expiration: "",
    driver_license_state: "",
    endorsements: [] as string[],
    restrictions: "",
    
    // Medical Information
    medical_cert_expiration: "",
    medical_examiner: "",
    medical_restrictions: "",
    
    // Emergency Contact
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relationship: "",
    
    // Performance (initial values)
    safety_score: 100,
    total_miles: 0,
    accident_count: 0,
    violation_count: 0,
    on_time_percentage: 100,
    fuel_efficiency: 0,
    
    // Training & Certifications
    hazmat_cert: false,
    hazmat_expiration: "",
    defensive_driving_cert: false,
    defensive_driving_expiration: "",
    
    // Notes
    notes: ""
  });

  const endorsementOptions = [
    "H - Hazardous Materials",
    "N - Tank Vehicles", 
    "P - Passenger",
    "S - School Bus",
    "T - Double/Triple Trailers",
    "X - Hazmat & Tank Combined"
  ];

  function handleInputChange(field: string, value: any) {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }

  function handleEndorsementChange(endorsement: string, checked: boolean) {
    setFormData(prev => ({
      ...prev,
      endorsements: checked 
        ? [...prev.endorsements, endorsement]
        : prev.endorsements.filter(e => e !== endorsement)
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare data for insert
      const driverData = {
        ...formData,
        years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
        pay_rate: formData.pay_rate ? parseFloat(formData.pay_rate) : null,
        endorsements: JSON.stringify(formData.endorsements),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("drivers_enhanced")
        .insert([driverData])
        .select()
        .single();

      if (error) {
        console.error("Error creating driver:", error);
        alert("Error creating driver: " + error.message);
        return;
      }

      alert("Driver created successfully! Onboarding process has been started.");
      
      // Check if onboarding was created (it should be automatic via trigger)
      const { data: onboardingData } = await supabase
        .from("driver_onboarding")
        .select("id")
        .eq("driver_id", data.id)
        .single();

      // Redirect to onboarding checklist if available, otherwise driver profile
      if (onboardingData?.id) {
        router.push(`/hr/onboarding/${onboardingData.id}`);
      } else {
        router.push(`/hr/drivers/${data.id}`);
      }

    } catch (err) {
      console.error("Error creating driver:", err);
      alert("Unexpected error creating driver");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/hr/drivers">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Add New Driver</h1>
          <p className="text-gray-600">Complete driver profile and employment information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <Input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter full name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee ID *
                </label>
                <Input
                  type="text"
                  required
                  value={formData.employee_id}
                  onChange={(e) => handleInputChange("employee_id", e.target.value)}
                  placeholder="Enter employee ID"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone *
                  </label>
                  <Input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <Input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => handleInputChange("date_of_birth", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <Input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="driver@ronyxlogistics.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <Input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <Input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <Input
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleInputChange("state", e.target.value)}
                      placeholder="CA"
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP
                    </label>
                    <Input
                      type="text"
                      value={formData.zip}
                      onChange={(e) => handleInputChange("zip", e.target.value)}
                      placeholder="12345"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Employment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hire Date *
                  </label>
                  <Input
                    type="date"
                    required
                    value={formData.hire_date}
                    onChange={(e) => handleInputChange("hire_date", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange("status", e.target.value)}
                    className="w-full border rounded-md px-3 py-2 bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Terminated">Terminated</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position
                </label>
                <Input
                  type="text"
                  value={formData.position}
                  onChange={(e) => handleInputChange("position", e.target.value)}
                  placeholder="Driver, Lead Driver, etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <Input
                    type="text"
                    value={formData.department}
                    onChange={(e) => handleInputChange("department", e.target.value)}
                    placeholder="Transportation"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supervisor
                  </label>
                  <Input
                    type="text"
                    value={formData.supervisor}
                    onChange={(e) => handleInputChange("supervisor", e.target.value)}
                    placeholder="Supervisor name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Years Experience
                </label>
                <Input
                  type="number"
                  value={formData.years_experience}
                  onChange={(e) => handleInputChange("years_experience", e.target.value)}
                  placeholder="5"
                  min="0"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pay Rate
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.pay_rate}
                    onChange={(e) => handleInputChange("pay_rate", e.target.value)}
                    placeholder="0.50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pay Type
                  </label>
                  <select
                    value={formData.pay_type}
                    onChange={(e) => handleInputChange("pay_type", e.target.value)}
                    className="w-full border rounded-md px-3 py-2 bg-white"
                  >
                    <option value="mileage">Per Mile</option>
                    <option value="hourly">Hourly</option>
                    <option value="salary">Salary</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CDL Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5" />
                CDL Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CDL Number *
                </label>
                <Input
                  type="text"
                  required
                  value={formData.cdl_number}
                  onChange={(e) => handleInputChange("cdl_number", e.target.value)}
                  placeholder="Enter CDL number"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CDL Class *
                  </label>
                  <select
                    required
                    value={formData.cdl_class}
                    onChange={(e) => handleInputChange("cdl_class", e.target.value)}
                    className="w-full border rounded-md px-3 py-2 bg-white"
                  >
                    <option value="A">Class A</option>
                    <option value="B">Class B</option>
                    <option value="C">Class C</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Issuing State
                  </label>
                  <Input
                    type="text"
                    value={formData.driver_license_state}
                    onChange={(e) => handleInputChange("driver_license_state", e.target.value)}
                    placeholder="CA"
                    maxLength={2}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CDL Expiration Date *
                </label>
                <Input
                  type="date"
                  required
                  value={formData.cdl_expiration}
                  onChange={(e) => handleInputChange("cdl_expiration", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endorsements
                </label>
                <div className="space-y-2">
                  {endorsementOptions.map((endorsement) => (
                    <label key={endorsement} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.endorsements.includes(endorsement)}
                        onChange={(e) => handleEndorsementChange(endorsement, e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{endorsement}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Restrictions
                </label>
                <Input
                  type="text"
                  value={formData.restrictions}
                  onChange={(e) => handleInputChange("restrictions", e.target.value)}
                  placeholder="Any license restrictions"
                />
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Name
                </label>
                <Input
                  type="text"
                  value={formData.emergency_contact_name}
                  onChange={(e) => handleInputChange("emergency_contact_name", e.target.value)}
                  placeholder="Emergency contact full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone
                </label>
                <Input
                  type="tel"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => handleInputChange("emergency_contact_phone", e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship
                </label>
                <Input
                  type="text"
                  value={formData.emergency_contact_relationship}
                  onChange={(e) => handleInputChange("emergency_contact_relationship", e.target.value)}
                  placeholder="Spouse, Parent, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  DOT Medical Certificate Expiration
                </label>
                <Input
                  type="date"
                  value={formData.medical_cert_expiration}
                  onChange={(e) => handleInputChange("medical_cert_expiration", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medical Examiner
                </label>
                <Input
                  type="text"
                  value={formData.medical_examiner}
                  onChange={(e) => handleInputChange("medical_examiner", e.target.value)}
                  placeholder="Dr. Smith"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Additional notes about the driver..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href="/hr/drivers">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Creating..." : "Create Driver"}
          </Button>
        </div>
      </form>
    </div>
  );
}
