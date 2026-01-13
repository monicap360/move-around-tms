import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export default async function Jobs() {
  const supabase = createSupabaseServerClient();
  const { data: jobs } = await supabase.from("jobs").select("*");
  return (
    <div className="p-8 bg-black text-white min-h-screen">
      <h1 className="text-4xl mb-6 font-bold">Open Positions</h1>
      {jobs?.map((job) => (
        <a
          key={job.id}
          href={`/recruit/jobs/${job.id}`}
          className="block p-4 bg-gray-900 rounded-xl mb-4"
        >
          <h2 className="text-2xl">{job.title}</h2>
          <p className="opacity-70">{job.requirements?.join(", ")}</p>
        </a>
      ))}
    </div>
  );
}
