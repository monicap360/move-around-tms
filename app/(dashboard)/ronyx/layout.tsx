import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import RonyxShell from "./RonyxShell";

export default async function RonyxLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerComponentClient({ cookies });

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const { data: userProfile } = await supabase
    .from("ronyx.drivers")
    .select("*")
    .eq("email", session.user.email)
    .single();

  if (!userProfile) {
    redirect("/unauthorized");
  }

  return (
    <RonyxShell
      user={{
        first_name: userProfile.first_name,
        last_name: userProfile.last_name,
        email: session.user.email,
      }}
    >
      {children}
    </RonyxShell>
  );
}
