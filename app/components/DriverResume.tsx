import { DriverRank } from "./DriverRank";

export default function DriverResume({ driver, resume }: any) {
  return (
    <div className="bg-white shadow-md p-6 rounded-xl">
      <h2 className="text-xl font-bold mb-2">{driver.name}</h2>

      {/* Status */}
      <div className="mb-4">
        <DriverRank status={driver.status} />
      </div>

      {/* Compliance */}
      <div className="flex flex-col gap-1 text-sm">
        <p>• TWIC: {driver.has_twic ? "✔️" : "❌"}</p>
        <p>• Medical Card: {driver.has_medical_card ? "✔️" : "❌"}</p>
        <p>• CDL: {driver.has_cdl ? "✔️" : "❌"}</p>
        <p>• Experience: {driver.experience_years} years</p>
      </div>

      <hr className="my-4" />

      {/* Resume */}
      <h3 className="font-semibold mb-1">Driver Resume</h3>
      <p className="text-sm">{resume?.bio}</p>

      <div className="mt-3 text-sm">
        <p><strong>Skills:</strong> {resume?.skills}</p>
        <p><strong>Certifications:</strong> {resume?.certifications}</p>
        <p><strong>Experience:</strong> {resume?.experience}</p>
      </div>
    </div>
  );
}
