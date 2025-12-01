import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

export default async function RecruiterProfile({ params }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  // Fetch company info and job posts
  const { data: company } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", params.company_id)
    .single();
  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .eq("organization_id", params.company_id)
    .order("created_at", { ascending: false });

  return (
    <div className="p-8 bg-black text-white min-h-screen">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">{company?.name || "Company"}</h1>
        <p className="opacity-70 mb-6">{company?.description}</p>
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Contact</h2>
          <p>Email: <a href={`mailto:${company?.contact_email}`} className="underline">{company?.contact_email}</a></p>
          {company?.contact_phone && <p>Phone: {company.contact_phone}</p>}
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-4">Active Job Postings</h2>
          {jobs?.length === 0 && <p className="opacity-60">No active jobs.</p>}
          <div className="space-y-4">
            {jobs?.map((job) => (
              <Link key={job.id} href={`/recruit/jobs/${job.id}`} className="block p-4 bg-gray-900 rounded-xl border border-gray-700 hover:bg-gray-800">
                <h3 className="text-xl font-bold">{job.title}</h3>
                <p className="opacity-70">{job.description}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {job.endorsements_required?.map((e) => (
                    <span key={e} className="px-2 py-1 bg-blue-900 rounded text-xs">{e}</span>
                  ))}
                  {job.twic_required && <span className="px-2 py-1 bg-blue-700 rounded text-xs">TWIC</span>}
                  {job.medical_card_required && <span className="px-2 py-1 bg-green-700 rounded text-xs">Medical</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
