export function DriverRank({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Operator: "bg-gray-600",
    "Skilled Operator": "bg-green-600",
    Professional: "bg-blue-600",
    "Fleet-Level": "bg-purple-600",
    "Master Operator": "bg-yellow-600",
    "Elite Certified": "bg-red-600",
    "Titan Driver": "bg-black text-yellow-400 border-2 border-yellow-400",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-white text-sm ${colors[status]}`}
    >
      {status}
    </span>
  );
}
