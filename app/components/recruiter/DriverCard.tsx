export default function DriverCard({ driver }) {
  return (
    <div className="p-4 rounded-xl bg-gray-900 border border-gray-700 hover:bg-gray-800">
      <h2 className="text-2xl">{driver.full_name}</h2>
      <p className="opacity-60">{driver.rank}</p>
      <div className="mt-4 text-sm opacity-70">
        <p>Loads: {driver.total_loads}</p>
        <p>Safety Score: {driver.safety_score}</p>
        <p>Experience: {driver.experience_years} yrs</p>
      </div>
      <div className="mt-3 flex gap-2">
        {driver.twic && (
          <span className="px-2 py-1 bg-blue-700 rounded-md text-xs">TWIC</span>
        )}
        {driver.medical_card && (
          <span className="px-2 py-1 bg-green-700 rounded-md text-xs">
            Medical
          </span>
        )}
      </div>
    </div>
  );
}
