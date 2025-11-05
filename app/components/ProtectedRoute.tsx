"use client";

import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log("ProtectedRoute check:", {
      loading,
      hasUser: !!user,
      hasSession: !!session,
      userEmail: user?.email
    });
    
    if (!loading && (!user || !session)) {
      console.log("❌ No authenticated user or session, redirecting to login");
      router.push("/login");
    } else if (!loading && user && session) {
      console.log("✅ User authenticated, allowing access");
    }
  }, [user, session, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
          <p className="text-sm text-gray-400 mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  if (!user || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    ); // Will redirect to login
  }

  return <>{children}</>;
}
