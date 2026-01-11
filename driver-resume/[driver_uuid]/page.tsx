import React from "react";
import { notFound } from "next/navigation";
import { getDriverResume } from "@/lib/driver";

export default async function DriverResumePage({
  params,
}: {
  params: { driver_uuid: string };
}) {
  const { driver_uuid } = params;
  const resume = await getDriverResume(driver_uuid);
  if (!resume) return notFound();

  return (
    <main className="max-w-2xl mx-auto py-10 px-4">
      <section className="flex items-center gap-6 mb-8">
        <img
          src={resume.avatarUrl || "/default-avatar.png"}
          alt={resume.name}
          className="w-24 h-24 rounded-full border shadow"
        />
        <div>
          <h1 className="text-3xl font-bold mb-1">{resume.name}</h1>
          <p className="text-lg text-gray-600 mb-2">
            {resume.licenseType} • {resume.experienceYears} yrs experience
          </p>
          <div className="text-sm text-gray-500">
            <span>{resume.email}</span>
            {resume.phone && <span className="ml-4">{resume.phone}</span>}
          </div>
        </div>
      </section>
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Badges</h2>
        <div className="flex flex-wrap gap-2">
          {resume.badges && resume.badges.length > 0 ? (
            resume.badges.map((badge: string) => (
              <span
                key={badge}
                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium"
              >
                {badge}
              </span>
            ))
          ) : (
            <span className="text-gray-400">No badges yet.</span>
          )}
        </div>
      </section>
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Professional Info</h2>
        <p className="text-gray-700 whitespace-pre-line">
          {resume.bio || "No bio provided."}
        </p>
      </section>
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Work History</h2>
        {resume.history && resume.history.length > 0 ? (
          <ul className="space-y-2">
            {resume.history.map((job: any, idx: number) => (
              <li key={idx} className="border rounded p-3">
                <div className="font-bold">{job.company}</div>
                <div className="text-sm text-gray-600">
                  {job.role} • {job.years} yrs
                </div>
                <div className="text-xs text-gray-500">{job.description}</div>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-gray-400">No work history yet.</span>
        )}
      </section>
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Certifications</h2>
        {resume.certifications && resume.certifications.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {resume.certifications.map((cert: string, idx: number) => (
              <li
                key={idx}
                className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium"
              >
                {cert}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-gray-400">No certifications yet.</span>
        )}
      </section>
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Download Résumé</h2>
        <a
          href={`/api/driver-resume/${driver_uuid}/download`}
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          target="_blank"
          rel="noopener noreferrer"
        >
          Download PDF
        </a>
      </section>
    </main>
  );
}
