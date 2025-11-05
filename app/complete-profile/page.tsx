"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Truck, Building2, Shield, Users, Briefcase, Wrench } from "lucide-react";

type UserRole = "driver" | "owner" | "office_staff" | "manager" | "hr" | "mechanic" | null;

export default function CompleteProfilePage() {
  const [userEmail, setUserEmail] = useState("");
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Common fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Driver-specific fields
  const [licenseNumber, setLicenseNumber] = useState("");
  const [payType, setPayType] = useState("per_load");
  const [hourlyRate, setHourlyRate] = useState("");
  const [perLoadRate, setPerLoadRate] = useState("");
  const [taxStatus, setTaxStatus] = useState("W2");

  // Office staff/Manager/HR fields
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }
      setUserEmail(user.email || "");
      
      // Check if user already has a profile
      const { data: existingDriver } = await supabase
        .from("drivers")
        .select("id")
        .eq("email", user.email)
        .single();

      if (existingDriver) {
        // Profile already exists, redirect to appropriate dashboard
        window.location.href = "/driver/profile";
        return;
      }

      setLoading(false);
    } catch (err) {
      console.error("Error loading user:", err);
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!name || !phone || !role) {
      setError("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      if (role === "driver") {
        // Create driver profile
        const driverData: any = {
          name,
          email: userEmail,
          phone,
          license_number: licenseNumber || null,
          pay_type: payType,
          tax_status: taxStatus,
        };

        if (payType === "hourly" && hourlyRate) {
          driverData.hourly_rate = parseFloat(hourlyRate);
        }
        if (payType === "per_load" && perLoadRate) {
          driverData.per_load_rate = parseFloat(perLoadRate);
        }

        const { error: driverError } = await supabase
          .from("drivers")
          .insert(driverData);

        if (driverError) throw driverError;

        setSuccess(true);
        setTimeout(() => {
          window.location.href = "/driver/profile";
        }, 2000);

      } else {
        // For non-drivers, we'll create an employees record
        // First check if employees table exists, if not, just create a driver record with role info
        const employeeData: any = {
          name,
          email: userEmail,
          phone,
          role: role,
          department: department || null,
          position: position || null,
        };

        // Try to insert into employees table (if it exists from migration 023)
        const { error: employeeError } = await supabase
          .from("employees")
          .insert(employeeData);

        if (employeeError) {
          // If employees table doesn't exist, create a basic driver record with role indicator
          console.log("Employees table not available, creating basic profile");
          const { error: fallbackError } = await supabase
            .from("drivers")
            .insert({
              name,
              email: userEmail,
              phone,
              pay_type: "salary", // Default for non-drivers
            });

          if (fallbackError) throw fallbackError;
        }

        setSuccess(true);
        setTimeout(() => {
          // Redirect based on role
          if (role === "owner" || role === "manager") {
            window.location.href = "/admin/compliance";
          } else if (role === "hr") {
            window.location.href = "/admin/hr-dashboard";
          } else if (role === "mechanic") {
            window.location.href = "/mechanic/dashboard";
          } else {
            window.location.href = "/";
          }
        }, 2000);
      }

    } catch (err: any) {
      console.error("Error creating profile:", err);
      setError(err.message || "Failed to create profile. Please contact your administrator.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-blue-200">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-blue-200">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="text-green-600 text-5xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-green-700 mb-2">Profile Created!</h2>
            <p className="text-gray-600">Redirecting you to your dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleOptions = [
    { value: "driver", label: "Driver", icon: Truck, description: "I operate vehicles and make deliveries" },
    { value: "owner", label: "Owner", icon: Building2, description: "I own the company" },
    { value: "manager", label: "Manager", icon: Shield, description: "I manage operations and teams" },
    { value: "office_staff", label: "Office Staff", icon: Briefcase, description: "I handle administrative tasks" },
    { value: "hr", label: "HR", icon: Users, description: "I manage human resources" },
    { value: "mechanic", label: "Mechanic", icon: Wrench, description: "I maintain and repair vehicles" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-200 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <User className="w-6 h-6" />
              Complete Your Profile
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Logged in as: <span className="font-semibold">{userEmail}</span>
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Role Selection */}
              {!role && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    What is your role? *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {roleOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setRole(option.value as UserRole)}
                          className="p-4 border-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
                        >
                          <div className="flex items-start gap-3">
                            <Icon className="w-6 h-6 text-blue-600 mt-1" />
                            <div>
                              <div className="font-semibold text-gray-800">{option.label}</div>
                              <div className="text-xs text-gray-600">{option.description}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Common Fields */}
              {role && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-800">
                      Selected role: <span className="font-semibold">
                        {roleOptions.find(r => r.value === role)?.label}
                      </span>
                      {" "}
                      <button
                        type="button"
                        onClick={() => setRole(null)}
                        className="text-blue-600 hover:underline ml-2"
                      >
                        Change
                      </button>
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="+1 555-123-4567"
                      />
                    </div>
                  </div>

                  {/* Driver-specific fields */}
                  {role === "driver" && (
                    <>
                      <div className="border-t pt-4">
                        <h3 className="font-semibold text-gray-800 mb-3">Driver Information</h3>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                              Driver's License Number
                            </label>
                            <input
                              type="text"
                              value={licenseNumber}
                              onChange={(e) => setLicenseNumber(e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="DL123456789"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Pay Type *
                              </label>
                              <select
                                value={payType}
                                onChange={(e) => setPayType(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="per_load">Per Load</option>
                                <option value="hourly">Hourly</option>
                                <option value="salary">Salary</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Tax Status *
                              </label>
                              <select
                                value={taxStatus}
                                onChange={(e) => setTaxStatus(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="W2">W2 Employee</option>
                                <option value="1099">1099 Contractor</option>
                              </select>
                            </div>
                          </div>

                          {payType === "hourly" && (
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Hourly Rate ($)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={hourlyRate}
                                onChange={(e) => setHourlyRate(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="25.00"
                              />
                            </div>
                          )}

                          {payType === "per_load" && (
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Per Load Rate ($)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={perLoadRate}
                                onChange={(e) => setPerLoadRate(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="150.00"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Office staff/Manager/HR/Mechanic fields */}
                  {(role === "office_staff" || role === "manager" || role === "hr" || role === "mechanic") && (
                    <>
                      <div className="border-t pt-4">
                        <h3 className="font-semibold text-gray-800 mb-3">Position Information</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                              Department
                            </label>
                            <input
                              type="text"
                              value={department}
                              onChange={(e) => setDepartment(e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g., Operations, HR, Finance"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                              Position/Title
                            </label>
                            <input
                              type="text"
                              value={position}
                              onChange={(e) => setPosition(e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g., Operations Manager"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-800 text-sm">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="flex-1"
                    >
                      {submitting ? "Creating Profile..." : "Complete Profile"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (confirm("Are you sure? You'll need to complete your profile to use the system.")) {
                          window.location.href = "/login";
                        }
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </form>
          </CardContent>
        </Card>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Need help? Contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
