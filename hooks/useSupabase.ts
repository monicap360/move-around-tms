"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AuthError, Session } from "@supabase/supabase-js";

export function useSupabase() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  const signInWithPassword = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error);
    return { data, error };
  };

  const signUpWithPassword = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) setError(error);
    return { data, error };
  };

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    if (error) setError(error);
    return { error };
  };

  const getSession = async (): Promise<Session | null> => {
    const { data } = await supabase.auth.getSession();
    return data.session;
  };

  return {
    supabase,
    loading,
    error,
    signInWithPassword,
    signUpWithPassword,
    signOut,
    getSession,
  };
}
