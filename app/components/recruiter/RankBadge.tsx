export default function RankBadge({ rank }) {
  const rankColors = {
    Operator: "bg-gray-700",
    "Certified Operator": "bg-blue-700",
    "Professional Operator": "bg-purple-700",
    "Fleet Captain": "bg-indigo-700",
    "Master Operator": "bg-yellow-500 text-black",
    "Titan Driver": "bg-red-600",
  };
  return (
    <span
      className={`inline-block px-3 py-1 rounded-lg mt-3 ${rankColors[rank] || "bg-gray-800"}`}
    >
      {rank}
    </span>
  );
}
