"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Upload, CheckCircle } from "lucide-react";

export default function DriverApplicationPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Application fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseState, setLicenseState] = useState("");
  const [licenseExpiration, setLicenseExpiration] = useState("");
  const [medicalCardExpiration, setMedicalCardExpiration] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [emergencyContactRelation, setEmergencyContactRelation] = useState("");

  // File uploads
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [medicalCardFile, setMedicalCardFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  async function uploadFile(file: File, folder: string) {
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `driver_applications/${email}/${folder}/${fileName}`;

    const { data, error } = await supabase.storage
      .from("hr_docs")
      .upload(filePath, file);

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from("hr_docs").getPublicUrl(filePath);

    return publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Upload documents
      let licenseUrl = null;
      let medicalCardUrl = null;
      let resumeUrl = null;

      if (licenseFile) {
        licenseUrl = await uploadFile(licenseFile, "license");
      }

      if (medicalCardFile) {
        medicalCardUrl = await uploadFile(medicalCardFile, "medical_card");
      }

      if (resumeFile) {
        resumeUrl = await uploadFile(resumeFile, "resume");
      }

      // Submit application
      const { error: insertError } = await supabase
        .from("driver_applications")
        .insert([
          {
            email,
            name,
            phone,
            address,
            city,
            state,
            zip_code: zipCode,
            license_number: licenseNumber,
            license_state: licenseState,
            license_expiration: licenseExpiration,
            medical_card_expiration: medicalCardExpiration,
            date_of_birth: dateOfBirth,
            emergency_contact_name: emergencyContactName,
            emergency_contact_phone: emergencyContactPhone,
            emergency_contact_relation: emergencyContactRelation,
            license_document_url: licenseUrl,
            medical_card_url: medicalCardUrl,
            resume_url: resumeUrl,
            application_status: "Pending",
          },
        ]);

      if (insertError) throw insertError;

      setSuccess(true);

      // Redirect after 3 seconds
      setTimeout(() => {
        window.location.href = "/driver/profile";
      }, 3000);
    } catch (err: any) {
      console.error("Error submitting application:", err);
      setError(err.message || "Failed to submit application");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-800 mb-2">
                Application Submitted!
              </h2>
              <p className="text-green-700 mb-4">
                Your application has been submitted for review by HR, Manager,
                and Owner. You'll be notified via email once your application is
                reviewed.
              </p>
              <p className="text-sm text-green-600">
                Redirecting to your profile...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Driver Application</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Complete this application to be considered for a driver position.
            Your application will be reviewed by our HR team, Manager, and
            Owner.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                Personal Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                Address
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address *
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    required
                    maxLength={2}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* License Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                License & Medical Card
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Number *
                  </label>
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License State *
                  </label>
                  <input
                    type="text"
                    value={licenseState}
                    onChange={(e) => setLicenseState(e.target.value)}
                    required
                    maxLength={2}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Expiration *
                  </label>
                  <input
                    type="date"
                    value={licenseExpiration}
                    onChange={(e) => setLicenseExpiration(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medical Card Expiration *
                  </label>
                  <input
                    type="date"
                    value={medicalCardExpiration}
                    onChange={(e) => setMedicalCardExpiration(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                Emergency Contact
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship *
                  </label>
                  <input
                    type="text"
                    value={emergencyContactRelation}
                    onChange={(e) =>
                      setEmergencyContactRelation(e.target.value)
                    }
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Document Uploads */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                Required Documents
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Driver's License *
                  </label>
                  <input
                    type="file"
                    onChange={(e) =>
                      setLicenseFile(e.target.files?.[0] || null)
                    }
                    required
                    accept="image/*,.pdf"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medical Card *
                  </label>
                  <input
                    type="file"
                    onChange={(e) =>
                      setMedicalCardFile(e.target.files?.[0] || null)
                    }
                    required
                    accept="image/*,.pdf"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Resume (Optional)
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  "Submitting..."
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Submit Application
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              * Required fields. Your application will be reviewed by HR,
              Manager, and Owner.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
