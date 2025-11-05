import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic"; // ensures fresh session check

export default async function DashboardPage() {
  // Get cookies for Supabase client
  const cookieStore = await cookies();
  
  // Create Supabase client bound to request cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  // Get current session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If not logged in, redirect to login
  if (!session) {
    redirect("/login");
  }

  // If logged in, redirect to dashboard instead of showing this page
  redirect("/dashboard");

  // Fetch user profile (optional)
  const { data: user } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-gray-50 p-8 flex flex-col items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-2xl text-center">
        <h1 className="text-3xl font-bold mb-4">Welcome to Your Dashboard 🚀</h1>
        <p className="text-gray-600 mb-6">
          You are successfully logged in with Supabase Auth.
        </p>

        <div className="bg-gray-100 p-4 rounded-lg text-left mb-4">
          <p>
            <strong>Email:</strong> {user?.user?.email ?? "Unknown"}
          </p>
          <p>
            <strong>Role:</strong> {user?.user?.role ?? "Authenticated"}
          </p>
          <p>
            <strong>Last Sign In:</strong>{" "}
            {user?.user?.last_sign_in_at
              ? new Date(user.user.last_sign_in_at).toLocaleString()
              : "N/A"}
          </p>
        </div>

        {/* Production Debug Info */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-left text-sm">
          <h3 className="font-semibold text-blue-900 mb-2">🔧 Production Debug Info:</h3>
          <p><strong>Environment:</strong> {process.env.NODE_ENV || 'development'}</p>
          <p><strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
          <p><strong>Has Supabase Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Yes' : '❌ No'}</p>
          <p><strong>Session ID:</strong> {session?.access_token?.substring(0, 20)}...</p>
          <p><strong>Auth Working:</strong> ✅ Yes (you can see this page)</p>
          <p><strong>Styling Working:</strong> {typeof window !== 'undefined' ? '✅ Yes (in browser)' : '🔄 Server-side'}</p>
        </div>

        <form action="/logout" method="post" className="mt-8">
          <button
            type="submit"
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition"
          >
            Log Out
          </button>
        </form>
      </div>
    </main>
  );
}