import React from "react";
import { notFound } from "next/navigation";
import { getRecruiterProfile, getActiveJobPostings } from "@/lib/recruiter";

// This page is public and SEO-friendly
export default async function RecruiterProfilePage({ searchParams }: { searchParams: { id?: string } }) {
  const recruiterId = searchParams?.id;
  if (!recruiterId) return notFound();

  // Fetch recruiter profile and active job postings
  const profile = await getRecruiterProfile(recruiterId);
  const jobs = await getActiveJobPostings(recruiterId);
  if (!profile) return notFound();

  return (
    <main className="max-w-3xl mx-auto py-10 px-4">
      <section className="flex items-center gap-6 mb-8">
        <img
          src={profile.avatarUrl || "/default-avatar.png"}
          alt={profile.name}
          className="w-24 h-24 rounded-full border shadow"
        />
        <div>
          <h1 className="text-3xl font-bold mb-1">{profile.name}</h1>
          <p className="text-lg text-gray-600 mb-2">{profile.companyName}</p>
          <div className="text-sm text-gray-500">
            <span>{profile.email}</span>
            {profile.phone && <span className="ml-4">{profile.phone}</span>}
          </div>
        </div>
      </section>
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">About</h2>
        <p className="text-gray-700 whitespace-pre-line">{profile.bio || "No bio provided."}</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-4">Active Job Postings</h2>
        {jobs.length === 0 ? (
          <p className="text-gray-500">No active job postings.</p>
        ) : (
          <ul className="space-y-4">
            {jobs.map((job: any) => (
              <li key={job.id} className="border rounded p-4 hover:shadow transition">
                <h3 className="text-lg font-bold">{job.title}</h3>
                <p className="text-gray-600 mb-1">{job.location}</p>
                <p className="text-gray-700 mb-2 line-clamp-2">{job.description}</p>
                <a
                  href={`/jobs/${job.id}`}
                  className="inline-block text-blue-600 hover:underline text-sm"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Details
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
