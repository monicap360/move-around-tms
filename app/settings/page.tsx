"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

// Simple toast implementation
const useToast = () => ({
  toast: ({ title, description, variant }: any) => {
    const message = title + (description ? `: ${description}` : '');
    if (variant === "destructive") {
      alert(`❌ ${message}`);
    } else {
      alert(`✅ ${message}`);
    }
  }
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
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      // Using existing supabase client from lib
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
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
        .from('profiles')
        .select('*')
        .eq('id', user.id)
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
      console.error('Error loading profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append('full_name', fullName);
      formData.append('phone', phone);

      const response = await fetch('/api/profile/update', {
        method: 'POST',
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
      console.error('Error updating profile:', error);
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
      const response = await fetch('/api/profile/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      console.error('Error updating password:', error);
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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)',
      padding: 0,
    }}>
      <h1 style={{ fontSize: 48, fontWeight: 700, marginBottom: 16, color: '#1e293b' }}>Settings</h1>
      <p style={{ fontSize: 20, color: '#475569', marginBottom: 32 }}>
        Manage your profile, contact info, and password.
      </p>
      <div style={{
        background: '#e0e7ef',
        borderRadius: 16,
        boxShadow: '0 2px 8px rgba(30,41,59,0.08)',
        padding: 32,
        minWidth: 340,
        minHeight: 180,
        width: '100%',
        maxWidth: 800,
        marginBottom: 24,
      }}>
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
                  <img src={profile.avatar_url} alt="Avatar" className="object-cover w-full h-full" />
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
                  const fileExt = file.name.split('.').pop();
                  const fileName = `${profile.id}-avatar.${fileExt}`;
                  // @ts-ignore
                  const { data, error } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
                  if (!error) {
                    // Get public URL
                    // @ts-ignore
                    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
                    if (urlData?.publicUrl) {
                      // @ts-ignore
                      await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', profile.id);
                      // Optionally update local state
                      window.location.reload();
                    }
                  } else {
                    alert('Upload failed: ' + error.message);
                  }
                }}
              />
              <span className="text-xs text-gray-500">Upload a square image for best results.</span>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className="text-sm font-medium">Email</label>
                  <Input
                    id="email"
                    type="email"
                    value={profile?.email || ""}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <label htmlFor="fullName" className="text-sm font-medium">Full Name</label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="text-sm font-medium">Phone</label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>

              <Button type="submit" disabled={saving} className="w-full md:w-auto">
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
                  <label htmlFor="newPassword" className="text-sm font-medium">New Password</label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</label>
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
            <p>Configure company info, user accounts, roles, and notification preferences.</p>
            <p>Brand: Move Around TMS™.</p>
          </CardContent>
        </Card>
      </div>
      <footer style={{ color: '#94a3b8', fontSize: 14, marginTop: 40 }}>© {new Date().getFullYear()} Move Around TMS</footer>
    </div>
  );
}
