"use client";

import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface UserProfile {
  id: string;
  role:
    | "super_admin"
    | "partner"
    | "manager"
    | "owner"
    | "company_admin"
    | "staff"
    | "user";
  full_name: string;
  company_id?: string;
}

interface PartnerInfo {
  id: string;
  full_name: string;
  theme: {
    primary_color?: string;
    secondary_color?: string;
    company_name?: string;
    logo_url?: string;
  };
}

export function useRoleBasedAuth() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = useCallback(async (userId: string) => {
    try {
      // Load user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // If user is a partner, load partner info
      if (profileData.role === "partner") {
        const { data: partnerData, error: partnerError } = await supabase
          .from("partners")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (partnerError) throw partnerError;
        setPartnerInfo(partnerData);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  }, []);

  const checkUser = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        await loadUserProfile(user.id);
      }
    } catch (error) {
      console.error("Error checking user:", error);
    } finally {
      setLoading(false);
    }
  }, [loadUserProfile]);

  useEffect(() => {
    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadUserProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setPartnerInfo(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkUser, loadUserProfile]);

  const getRedirectPath = useCallback((): string => {
    if (!profile) return "/auth";

    // Special case for RonYX partner - Veronica Butanda
    if (user?.email === "melidazvl@outlook.com") {
      return "/veronica"; // Veronica's detailed Next.js dashboard
    }

    switch (profile.role) {
      case "super_admin":
        // Monica, Breanna, Shamsa, Sylvia - unified admin access
        return "/admin"; // Full admin dashboard
      case "partner":
      case "manager":
        return "/partners/dashboard"; // Generic partner dashboard
      case "company_admin":
      case "staff":
        return "/company/dashboard"; // Company dashboard
      default:
        return "/dashboard"; // Regular user dashboard
    }
  }, [profile, user?.email]);

  function hasPermission(requiredRole: string): boolean {
    if (!profile) return false;

    const roleHierarchy = {
      super_admin: 5,
      partner: 4,
      manager: 4,
      owner: 3,
      company_admin: 3,
      staff: 2,
      user: 1,
    };

    const userLevel =
      roleHierarchy[profile.role as keyof typeof roleHierarchy] || 0;
    const requiredLevel =
      roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

    return userLevel >= requiredLevel;
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return {
    user,
    profile,
    partnerInfo,
    loading,
    getRedirectPath,
    hasPermission,
    signOut,
    supabase,
  };
}

export function RoleBasedRedirect() {
  const { profile, loading, getRedirectPath } = useRoleBasedAuth();

  useEffect(() => {
    if (!loading && profile) {
      const redirectPath = getRedirectPath();
      if (window.location.pathname !== redirectPath) {
        window.location.href = redirectPath;
      }
    }
  }, [profile, loading, getRedirectPath]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return null;
}
