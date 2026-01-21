import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import RonyxShell from "./RonyxShell";

export const dynamic = "force-dynamic";

export default async function RonyxLayout({ children }: { children: React.ReactNode }) {
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (demoMode || !supabaseUrl || !supabaseAnonKey) {
    return (
      <RonyxShell
        user={{
          first_name: "Ronyx",
          last_name: "Demo",
          email: "demo@ronyx.movearoundtms.com",
        }}
      >
        {children}
      </RonyxShell>
    );
  }

  try {
    const supabase = createServerComponentClient({ cookies });
    const { data, error } = await supabase.auth.getSession();
    const session = data?.session ?? null;

    if (error || !session) {
      redirect("/ronyx/login");
    }

    const userEmail = session.user?.email;

    if (!userEmail) {
      redirect("/ronyx/login");
    }

    const { data: userProfile, error: profileError } = await supabase
      .from("ronyx.drivers")
      .select("*")
      .eq("email", userEmail)
      .single();

    if (profileError || !userProfile) {
      redirect("/ronyx/login");
    }

    return (
      <RonyxShell
        user={{
          first_name: userProfile.first_name,
          last_name: userProfile.last_name,
          email: userEmail,
        }}
      >
        {children}
      </RonyxShell>
    );
  } catch {
    redirect("/ronyx/login");
  }
}
