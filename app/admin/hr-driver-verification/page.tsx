"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { CheckCircle, XCircle, AlertCircle, Eye } from "lucide-react";

type DriverProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  license_number: string;
  license_expiration: string;
  medical_card_expiration: string;
  profile_completed_by_driver: boolean;
  hr_verified: boolean;
  license_verified: boolean;
  medical_card_verified: boolean;
  documents_verified: boolean;
  hr_notes: string;
};

export default function HRDriverVerificationPage() {
  const [profiles, setProfiles] = useState<DriverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminToken, setAdminToken] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<DriverProfile | null>(
    null,
  );
  const [verificationNotes, setVerificationNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = prompt("Enter admin token:");
    if (token) {
      setAdminToken(token);
      loadProfiles(token);
    }
  }, []);

  async function loadProfiles(token: string) {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/hr/driver-verification", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to load profiles");

      const data = await response.json();
      setProfiles(data.profiles || []);
    } catch (err) {
      console.error("Error loading profiles:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerification(
    profileId: string,
    field: string,
    value: boolean,
  ) {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/hr/driver-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          profileId,
          field,
          value,
          notes: verificationNotes,
        }),
      });

      if (!response.ok) throw new Error("Failed to update verification");

      // Reload profiles
      await loadProfiles(adminToken);
      setVerificationNotes("");
      alert("Verification updated successfully");
    } catch (err) {
      console.error("Error updating verification:", err);
      alert("Failed to update verification");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Loading driver profiles...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Driver Profile Verification
        </h1>
        <p className="text-gray-600">
          Review and verify driver-submitted profiles and documents
        </p>
      </div>

      {/* Pending Profiles */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Pending Verification</CardTitle>
        </CardHeader>
        <CardContent>
          {profiles.filter(
            (p) => !p.hr_verified && p.profile_completed_by_driver,
          ).length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No pending profiles to verify
            </p>
          ) : (
            <div className="space-y-4">
              {profiles
                .filter((p) => !p.hr_verified && p.profile_completed_by_driver)
                .map((profile) => (
                  <div
                    key={profile.id}
                    className="border rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {profile.name}
                        </h3>
                        <p className="text-sm text-gray-600">{profile.email}</p>
                        <p className="text-sm text-gray-600">{profile.phone}</p>
                        <div className="mt-2 space-y-1">
                          <p className="text-xs">
                            License: {profile.license_number} (Exp:{" "}
                            {profile.license_expiration || "N/A"})
                          </p>
                          <p className="text-xs">
                            Medical Card Exp:{" "}
                            {profile.medical_card_expiration || "N/A"}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => setSelectedProfile(profile)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Review
                        </Button>
                      </div>
                    </div>

                    {selectedProfile?.id === profile.id && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="flex items-center gap-2 text-sm font-medium">
                              <input
                                type="checkbox"
                                checked={profile.license_verified}
                                onChange={(e) =>
                                  handleVerification(
                                    profile.id,
                                    "license_verified",
                                    e.target.checked,
                                  )
                                }
                                className="w-4 h-4"
                              />
                              License Verified
                            </label>
                          </div>

                          <div>
                            <label className="flex items-center gap-2 text-sm font-medium">
                              <input
                                type="checkbox"
                                checked={profile.medical_card_verified}
                                onChange={(e) =>
                                  handleVerification(
                                    profile.id,
                                    "medical_card_verified",
                                    e.target.checked,
                                  )
                                }
                                className="w-4 h-4"
                              />
                              Medical Card Verified
                            </label>
                          </div>

                          <div>
                            <label className="flex items-center gap-2 text-sm font-medium">
                              <input
                                type="checkbox"
                                checked={profile.documents_verified}
                                onChange={(e) =>
                                  handleVerification(
                                    profile.id,
                                    "documents_verified",
                                    e.target.checked,
                                  )
                                }
                                className="w-4 h-4"
                              />
                              All Documents Verified
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">
                            HR Notes
                          </label>
                          <textarea
                            value={verificationNotes}
                            onChange={(e) =>
                              setVerificationNotes(e.target.value)
                            }
                            className="w-full px-3 py-2 border rounded-lg"
                            rows={3}
                            placeholder="Add verification notes..."
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() =>
                              handleVerification(
                                profile.id,
                                "hr_verified",
                                true,
                              )
                            }
                            disabled={saving}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve Profile
                          </Button>

                          <Button
                            onClick={() => setSelectedProfile(null)}
                            variant="outline"
                          >
                            Close
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verified Profiles */}
      <Card>
        <CardHeader>
          <CardTitle>Verified Profiles</CardTitle>
        </CardHeader>
        <CardContent>
          {profiles.filter((p) => p.hr_verified).length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No verified profiles yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Email</th>
                    <th className="text-left p-3">License</th>
                    <th className="text-left p-3">Medical Card</th>
                    <th className="text-left p-3">Documents</th>
                    <th className="text-left p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles
                    .filter((p) => p.hr_verified)
                    .map((profile) => (
                      <tr
                        key={profile.id}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="p-3 font-medium">{profile.name}</td>
                        <td className="p-3">{profile.email}</td>
                        <td className="p-3">
                          {profile.license_verified ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-400" />
                          )}
                        </td>
                        <td className="p-3">
                          {profile.medical_card_verified ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-400" />
                          )}
                        </td>
                        <td className="p-3">
                          {profile.documents_verified ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-400" />
                          )}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                            Verified
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
