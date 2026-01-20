"use client";
/* eslint-disable @next/next/no-img-element */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { VERTICAL_PROFILES, VerticalType, type VerticalTypeString } from "@/lib/verticals";
import { LanguageSwitcher } from "../lib/i18n/context";

// Simple toast implementation
const useToast = () => ({
  toast: ({ title, description, variant }: any) => {
    const message = title + (description ? `: ${description}` : "");
    if (variant === "destructive") {
      alert(`❌ ${message}`);
    } else {
      alert(`✅ ${message}`);
    }
  },
});

interface UserProfile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  email?: string;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [verticalType, setVerticalType] = useState<VerticalTypeString>("construction_hauling");
  const [savingVertical, setSavingVertical] = useState(false);
  const { toast } = useToast();

  const loadProfile = useCallback(async () => {
    try {
      // Using existing supabase client from lib
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        toast({
          title: "Error",
          description: "Not authenticated",
          variant: "destructive",
        });
        return;
      }

      // Try to get profile from profiles table first
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile({
          id: user.id,
          email: user.email,
          full_name: profileData.full_name,
          avatar_url: profileData.avatar_url,
          phone: profileData.phone,
        });
        setFullName(profileData.full_name || "");
        setPhone(profileData.phone || "");
      } else {
        // Fallback to user metadata
        setProfile({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata.full_name || "",
          avatar_url: user.user_metadata.avatar_url || "",
          phone: user.user_metadata.phone || "",
        });
        setFullName(user.user_metadata.full_name || "");
        setPhone(user.user_metadata.phone || "");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadOrganization = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's organization
      const { data: organizationMembership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (organizationMembership?.organization_id) {
        setOrganizationId(organizationMembership.organization_id);

        // Get organization's vertical type
        const { data: organizationRecord } = await supabase
          .from("organizations")
          .select("vertical_type")
          .eq("id", organizationMembership.organization_id)
          .single();

        if (organizationRecord?.vertical_type) {
          setVerticalType(organizationRecord.vertical_type as VerticalTypeString);
        }
      }
    } catch (error) {
      console.error("Error loading organization:", error);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    loadOrganization();
  }, [loadProfile, loadOrganization]);

  const handleVerticalChange = async (newVertical: VerticalTypeString) => {
    if (!organizationId) {
      toast({
        title: "Error",
        description: "No organization found",
        variant: "destructive",
      });
      return;
    }

    setSavingVertical(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ vertical_type: newVertical })
        .eq("id", organizationId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update industry type",
          variant: "destructive",
        });
      } else {
        setVerticalType(newVertical);
        toast({
          title: "Success",
          description: "Industry type updated successfully",
        });
      }
    } catch (error) {
      console.error("Error updating vertical:", error);
      toast({
        title: "Error",
        description: "Failed to update industry type",
        variant: "destructive",
      });
    } finally {
      setSavingVertical(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("full_name", fullName);
      formData.append("phone", phone);

      const response = await fetch("/api/profile/update", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
        loadProfile(); // Reload profile data
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to update profile",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/profile/password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ new_password: newPassword }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Password updated successfully",
        });
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to update password",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating password:", error);
      toast({
        title: "Error",
        description: "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)",
        padding: 0,
      }}
    >
      <h1
        style={{
          fontSize: 48,
          fontWeight: 700,
          marginBottom: 16,
          color: "#1e293b",
        }}
      >
        Settings
      </h1>
      <p style={{ fontSize: 20, color: "#475569", marginBottom: 32 }}>
        Manage your profile, contact info, and password.
      </p>
      <div
        style={{
          background: "white",
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(30,41,59,0.08)",
          padding: 16,
          width: "100%",
          maxWidth: 800,
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontWeight: 600, color: "#1e293b" }}>Language</div>
          <div style={{ fontSize: 14, color: "#64748b" }}>
            Switch between English and Spanish
          </div>
        </div>
        <LanguageSwitcher />
      </div>
      <div
        style={{
          background: "#e0e7ef",
          borderRadius: 16,
          boxShadow: "0 2px 8px rgba(30,41,59,0.08)",
          padding: 32,
          minWidth: 340,
          minHeight: 180,
          width: "100%",
          maxWidth: 800,
          marginBottom: 24,
        }}
      >
        {/* Profile Information */}
        <Card className="shadow-lg border border-gray-200 bg-white">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-t-lg">
            <CardTitle>Profile Settings</CardTitle>
          </CardHeader>
          <CardContent className="mt-6 space-y-6">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-2 mb-4">
              <div className="w-24 h-24 rounded-full overflow-hidden border border-gray-300 bg-gray-100 flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span className="text-gray-400">No Avatar</span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                className="mt-2"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  // Upload to Supabase Storage (demo: assumes supabase client is available)
                  const fileExt = file.name.split(".").pop();
                  const fileName = `${profile.id}-avatar.${fileExt}`;
                  // @ts-ignore
                  const { data, error } = await supabase.storage
                    .from("avatars")
                    .upload(fileName, file, { upsert: true });
                  if (!error) {
                    // Get public URL
                    // @ts-ignore
                    const { data: urlData } = supabase.storage
                      .from("avatars")
                      .getPublicUrl(fileName);
                    if (urlData?.publicUrl) {
                      // @ts-ignore
                      await supabase
                        .from("profiles")
                        .update({ avatar_url: urlData.publicUrl })
                        .eq("id", profile.id);
                      // Optionally update local state
                      window.location.reload();
                    }
                  } else {
                    alert("Upload failed: " + error.message);
                  }
                }}
              />
              <span className="text-xs text-gray-500">
                Upload a square image for best results.
              </span>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={profile?.email || ""}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Email cannot be changed
                  </p>
                </div>

                <div>
                  <label htmlFor="fullName" className="text-sm font-medium">
                    Full Name
                  </label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="text-sm font-medium">
                    Phone
                  </label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={saving}
                className="w-full md:w-auto"
              >
                {saving ? "Updating..." : "Update Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card className="shadow-lg border border-gray-200 bg-white">
          <CardHeader className="bg-gradient-to-r from-red-500 to-red-700 text-white rounded-t-lg">
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
          <CardContent className="mt-6">
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="newPassword" className="text-sm font-medium">
                    New Password
                  </label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="text-sm font-medium"
                  >
                    Confirm Password
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={saving || !newPassword || !confirmPassword}
                className="w-full md:w-auto bg-red-600 hover:bg-red-700"
              >
                {saving ? "Updating..." : "Change Password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Company Information */}
        <Card className="shadow-lg border border-gray-200 bg-white">
          <CardHeader className="bg-gradient-to-r from-green-500 to-green-700 text-white rounded-t-lg">
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-700 mt-4 space-y-2">
            <p>
              Configure company info, user accounts, roles, and notification
              preferences.
            </p>
            <p>Brand: Move Around TMS™.</p>
          </CardContent>
        </Card>

        {/* Industry Specialization */}
        <Card className="border border-space-border bg-space-panel mt-6">
          <CardHeader className="bg-space-surface border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider">Industry Specialization</CardTitle>
          </CardHeader>
          <CardContent className="mt-6 space-y-4">
            <p className="text-text-secondary text-sm">
              Select your industry vertical to optimize confidence scoring baselines, 
              anomaly detection priorities, and dashboard metrics for your specific operations.
            </p>
            
            <div className="space-y-3">
              <label htmlFor="verticalType" className="text-sm font-medium text-text-primary">
                Industry Type
              </label>
              <select
                id="verticalType"
                value={verticalType}
                onChange={(e) => handleVerticalChange(e.target.value as VerticalTypeString)}
                disabled={savingVertical || !organizationId}
                className="w-full p-2 bg-space-surface border border-space-border rounded text-text-primary focus:border-gold-primary focus:outline-none"
              >
                {Object.values(VERTICAL_PROFILES).map((profile) => (
                  <option key={profile.type} value={profile.type}>
                    {profile.name}
                  </option>
                ))}
              </select>
              
              {/* Show selected vertical details */}
              {verticalType && VERTICAL_PROFILES[verticalType as VerticalType] && (
                <div className="mt-4 p-4 bg-space-surface border border-space-border rounded">
                  <p className="text-text-secondary text-sm mb-3">
                    {VERTICAL_PROFILES[verticalType as VerticalType].description}
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-text-secondary">Driver Baseline:</span>
                      <span className="text-gold-primary ml-2">
                        {VERTICAL_PROFILES[verticalType as VerticalType].baselineWindowDays.driver} days
                      </span>
                    </div>
                    <div>
                      <span className="text-text-secondary">Site Baseline:</span>
                      <span className="text-gold-primary ml-2">
                        {VERTICAL_PROFILES[verticalType as VerticalType].baselineWindowDays.site} days
                      </span>
                    </div>
                    {VERTICAL_PROFILES[verticalType as VerticalType].baselineWindowDays.route && (
                      <div>
                        <span className="text-text-secondary">Route Baseline:</span>
                        <span className="text-gold-primary ml-2">
                          {VERTICAL_PROFILES[verticalType as VerticalType].baselineWindowDays.route} days
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3">
                    <span className="text-text-secondary text-sm">Key Focus Areas:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {VERTICAL_PROFILES[verticalType as VerticalType].emphasis.exceptionFocus.map((focus) => (
                        <span 
                          key={focus} 
                          className="px-2 py-1 bg-space-panel border border-space-border rounded text-xs text-text-secondary"
                        >
                          {focus.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {!organizationId && (
                <p className="text-yellow-500 text-sm">
                  No organization found. Please contact support to set up your organization.
                </p>
              )}
              
              {savingVertical && (
                <p className="text-gold-primary text-sm">Saving...</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <footer style={{ color: "#6B7280", fontSize: 11, marginTop: 40, textTransform: "uppercase", letterSpacing: "0.1em" }}>
        Ronyx Logistics LLC
      </footer>
    </div>
  );
}
