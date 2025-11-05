import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function POST() {
  // Get cookies for Supabase client
  const cookieStore = await cookies();
  
  // Create Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Sign out the user
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error("Logout error:", error);
    return new Response("Error logging out", { status: 500 });
  }

  // Redirect to login page
  redirect("/login");
}