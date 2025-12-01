export default function RecruiterActionBar({ driver_uuid }) {
  return (
    <div className="flex gap-4 mt-6">
      <a
        href={`/driver-resume/${driver_uuid}`}
        className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
      >
        View Résumé
      </a>
      <a
        href={`/api/hiring/reveal/${driver_uuid}`}
        className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700"
      >
        Reveal Contact
      </a>
    </div>
  );
}
