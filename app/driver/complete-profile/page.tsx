"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Truck, Phone, Mail, DollarSign, FileText } from "lucide-react";

export default function CompleteProfilePage() {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [hasProfile, setHasProfile] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [payType, setPayType] = useState("Per Load");
  const [hourlyRate, setHourlyRate] = useState("");
  const [perLoadRate, setPerLoadRate] = useState("");
  const [taxStatus, setTaxStatus] = useState("W2");
  const [employmentType, setEmploymentType] = useState("full-time");

  useEffect(() => {
    checkProfile();
  }, []);

  async function checkProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUserEmail(user.email || "");

      // Check if driver profile already exists
      const { data: driver } = await supabase
        .from("drivers")
        .select("id, name, email")
        .eq("email", user.email)
        .single();

      if (driver) {
        setHasProfile(true);
      }
    } catch (err) {
      console.error("Error checking profile:", err);
    } finally {
      setChecking(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      // Prepare driver data
      const driverData: any = {
        email: user.email,
        name: name.trim(),
        phone: phone.trim() || null,
        license_number: licenseNumber.trim() || null,
        pay_type: payType,
        tax_status: taxStatus,
        employment_type: employmentType,
        created_at: new Date().toISOString(),
      };

      // Add rate based on pay type
      if (payType === "Hourly" && hourlyRate) {
        driverData.hourly_rate = parseFloat(hourlyRate);
      } else if (payType === "Per Load" && perLoadRate) {
        driverData.per_load_rate = parseFloat(perLoadRate);
      }

      // Insert driver profile
      const { error: insertError } = await supabase
        .from("drivers")
        .insert([driverData]);

      if (insertError) {
        throw insertError;
      }

      setSuccess(true);
      setTimeout(() => {
        window.location.href = "/driver/profile";
      }, 2000);
    } catch (err: any) {
      console.error("Error creating profile:", err);
      setError(err.message || "Failed to create profile");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="p-8 min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Checking your profile...</p>
      </div>
    );
  }

  if (hasProfile) {
    return (
      <div className="p-8 min-h-screen flex items-center justify-center">
        <Card className="max-w-md border-green-200 bg-green-50">
          <CardContent className="pt-6 text-center">
            <div className="text-green-600 text-5xl mb-4">✓</div>
            <h2 className="text-xl font-bold text-green-800 mb-2">Profile Already Complete</h2>
            <p className="text-gray-700 mb-4">
              You already have a driver profile set up.
            </p>
            <Button onClick={() => window.location.href = "/driver/profile"}>
              Go to My Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="p-8 min-h-screen flex items-center justify-center">
        <Card className="max-w-md border-green-200 bg-green-50">
          <CardContent className="pt-6 text-center">
            <div className="text-green-600 text-5xl mb-4">✓</div>
            <h2 className="text-xl font-bold text-green-800 mb-2">Profile Created!</h2>
            <p className="text-gray-700 mb-2">
              Your driver profile has been created successfully.
            </p>
            <p className="text-sm text-gray-600">Redirecting to your profile...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Complete Your Driver Profile</h1>
        <p className="text-gray-600">
          Welcome! Please fill in your information to complete your driver profile.
        </p>
        {userEmail && (
          <p className="text-sm text-blue-600 mt-2">
            Logged in as: <span className="font-semibold">{userEmail}</span>
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John Smith"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Phone Number
              </label>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+15551234567"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                E.164 format recommended (e.g., +15551234567) for SMS ticket uploads
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Driver's License Number
              </label>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="DL123456"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Employment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Employment Type <span className="text-red-500">*</span>
              </label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="full-time">Full Time</option>
                <option value="part-time">Part Time</option>
                <option value="contractor">Contractor</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Tax Status <span className="text-red-500">*</span>
              </label>
              <select
                value={taxStatus}
                onChange={(e) => setTaxStatus(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="W2">W2 Employee</option>
                <option value="1099">1099 Contractor</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                W2 = Employee with tax withholding | 1099 = Independent contractor
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pay Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Pay Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Pay Type <span className="text-red-500">*</span>
              </label>
              <select
                value={payType}
                onChange={(e) => {
                  setPayType(e.target.value);
                  setHourlyRate("");
                  setPerLoadRate("");
                }}
                required
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Per Load">Per Load</option>
                <option value="Hourly">Hourly</option>
              </select>
            </div>

            {payType === "Hourly" && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Hourly Rate ($) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="25.00"
                />
              </div>
            )}

            {payType === "Per Load" && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Rate Per Load ($) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={perLoadRate}
                  onChange={(e) => setPerLoadRate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="130.00"
                />
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> If you're unsure about your pay rate, you can leave it blank 
                and your manager will set it up for you. Contact your manager if you have questions.
              </p>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-800 text-center">{error}</p>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
          >
            {loading ? "Creating Profile..." : "Create My Profile"}
          </Button>
          <Button
            type="button"
            onClick={() => window.location.href = "/"}
            variant="outline"
            className="px-6"
          >
            Cancel
          </Button>
        </div>

        <p className="text-xs text-center text-gray-500">
          By creating your profile, you agree to provide accurate information. 
          Your manager may review and update these details as needed.
        </p>
      </form>
    </div>
  );
}
