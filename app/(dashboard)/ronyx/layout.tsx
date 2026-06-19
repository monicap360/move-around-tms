import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import RonyxShell from "./RonyxShell";

export const dynamic = "force-dynamic";

export default async function RonyxLayout({ children }: { children: React.ReactNode }) {
  const demoMode = true; // Auth bypass — re-enable when org/RLS/signup is wired
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
    const cookieStore = cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    });

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      redirect("/ronyx-login");
    }

    const firstName = (user.user_metadata?.first_name as string) || user.email?.split("@")[0] || "User";
    const lastName = (user.user_metadata?.last_name as string) || "";

    return (
      <RonyxShell
        user={{
          first_name: firstName,
          last_name: lastName,
          email: user.email || "",
        }}
      >
        {children}
      </RonyxShell>
    );
  } catch {
    redirect("/ronyx-login");
  }
}
