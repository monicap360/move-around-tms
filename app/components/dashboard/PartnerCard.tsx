"use client";

interface PartnerCardProps {
  name: string;
  brand: string;
  companies: number;
  commission: number;
  color: string;
  onClick?: () => void;
}

export default function PartnerCard({
  name,
  brand,
  companies,
  commission,
  color,
  onClick,
}: PartnerCardProps) {
  return (
    <div
      className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all hover:scale-105 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-lg font-bold text-gray-900">{brand}</h4>
          <p className="text-sm text-gray-600">{name}</p>
        </div>
        <div
          className="w-4 h-4 rounded-full shadow-inner"
          style={{ backgroundColor: color }}
        ></div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xl font-bold">{companies}</p>
          <p className="text-xs text-gray-600">Companies</p>
        </div>
        <div>
          <p className="text-xl font-bold" style={{ color }}>
            ${commission}
          </p>
          <p className="text-xs text-gray-600">Commission</p>
        </div>
      </div>

      <button
        className="w-full py-2 px-3 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
        style={{ backgroundColor: color }}
      >
        View Partner Portal
      </button>
    </div>
  );
}
