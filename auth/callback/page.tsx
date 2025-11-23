"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function Callback() {
  const router = useRouter();

  useEffect(() => {
    const handle = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // If the user is logged in, send them to the dashboard
      if (session) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    };
    handle();
  }, [router]);

  return <div>Redirecting...</div>;
}
