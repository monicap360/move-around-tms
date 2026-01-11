import { createClient } from "@supabase/supabase-js";

export default async function RecruiterProfile({ params }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data: recruiter } = await supabase
    .from("recruiters")
    .select("*")
    .eq("id", params.recruiter_id)
    .single();
  const { data: jobs } = await supabase
    .from("job_postings")
    .select("*")
    .eq("recruiter_id", params.recruiter_id);
  return (
    <div className="min-h-screen bg-white p-8 text-gray-900">
      <h1 className="text-3xl font-bold mb-2">
        {recruiter?.company_name || "Recruiter"}
      </h1>
      <p className="mb-2">Contact: {recruiter?.contact_email}</p>
      <p className="mb-6">{recruiter?.bio}</p>
      <h2 className="text-xl font-semibold mb-2">Active Job Postings</h2>
      <ul className="space-y-2">
        {jobs?.length ? (
          jobs.map((job) => (
            <li key={job.id} className="p-4 bg-gray-100 rounded-xl">
              <div className="font-bold">{job.title}</div>
              <div className="text-sm">{job.location}</div>
              <div className="text-xs text-gray-500">{job.type}</div>
            </li>
          ))
        ) : (
          <li>No active jobs.</li>
        )}
      </ul>
    </div>
  );
}
