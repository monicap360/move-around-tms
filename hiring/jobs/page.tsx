export default async function JobBoard() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/hiring/jobs`, {
    cache: "no-store",
  });
  const { jobs } = await res.json();

  return (
    <div className="p-10 text-white bg-black min-h-screen">
      <h1 className="text-3xl font-bold">Driver Jobs</h1>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {jobs.map((job) => (
          <div key={job.id} className="p-5 bg-gray-900 rounded-xl">
            <h2 className="text-xl font-bold">{job.job_title}</h2>
            <p className="opacity-70">{job.company_name}</p>
            <p className="mt-2">{job.job_description}</p>
            <a
              href={`/hiring/job/${job.id}`}
              className="mt-4 inline-block px-4 py-2 bg-blue-600 rounded"
            >
              View
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
