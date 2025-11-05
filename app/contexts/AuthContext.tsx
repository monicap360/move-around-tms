"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log("🔄 Checking initial session...");
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!mounted) return;
        
        if (error) {
          console.error("❌ Error getting session:", error);
        } else {
          console.log("📋 Initial session result:", {
            hasSession: !!session,
            userEmail: session?.user?.email || "No user",
            expiresAt: session?.expires_at ? new Date(session.expires_at * 1000) : "N/A"
          });
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (err) {
        console.error("💥 Session fetch error:", err);
      } finally {
        if (mounted) {
          console.log("✅ Auth context initialization complete");
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log("=== AUTH STATE CHANGE ===");
        console.log("Event:", event);
        console.log("User email:", session?.user?.email || "No user");
        console.log("Session valid:", !!session);
        console.log("Session expires:", session?.expires_at ? new Date(session.expires_at * 1000) : "N/A");
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (event === 'SIGNED_IN') {
          console.log("✅ USER SIGNED IN SUCCESSFULLY");
        } else if (event === 'SIGNED_OUT') {
          console.log("❌ USER SIGNED OUT");
        } else if (event === 'TOKEN_REFRESHED') {
          console.log("🔄 TOKEN REFRESHED");
        }
        console.log("=== END AUTH STATE CHANGE ===");
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Sign out error:", error);
      }
    } catch (err) {
      console.error("Unexpected sign out error:", err);
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
