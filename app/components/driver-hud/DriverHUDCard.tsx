import React from "react";
import { DriverPhoto } from "./DriverPhoto";
import { TruckLogoBadge } from "./TruckLogoBadge";

export interface DriverHUDCardProps {
  name: string;
  photoUrl?: string;
  logoUrl?: string;
  truckNumber?: string;
  yard?: string;
  lastTicket?: string;
  aiRiskScore?: number;
  editable?: boolean;
  onChangePhoto?: () => void;
  onChangeLogo?: () => void;
  onEdit?: () => void;
}

export const DriverHUDCard: React.FC<DriverHUDCardProps> = ({
  name,
  photoUrl,
  logoUrl,
  truckNumber,
  yard,
  lastTicket,
  aiRiskScore,
  editable,
  onChangePhoto,
  onChangeLogo,
  onEdit,
}) => (
  <div className="bg-black/80 rounded-2xl shadow-2xl p-6 flex flex-col items-center gap-4 border border-cyan-800 relative group hover:scale-105 transition-transform cursor-pointer">
    <div className="flex gap-6 items-center">
      <DriverPhoto
        photoUrl={photoUrl}
        name={name}
        editable={editable}
        onChangePhoto={onChangePhoto}
      />
      <TruckLogoBadge
        logoUrl={logoUrl}
        editable={editable}
        onChangeLogo={onChangeLogo}
      />
    </div>
    <div className="mt-2 text-cyan-200 text-xl font-bold text-center">
      {name}
    </div>
    <div className="flex flex-wrap gap-3 justify-center mt-2">
      {truckNumber && (
        <span className="bg-cyan-900 text-cyan-200 px-3 py-1 rounded-full text-xs font-semibold">
          Truck #{truckNumber}
        </span>
      )}
      {yard && (
        <span className="bg-cyan-800 text-cyan-100 px-3 py-1 rounded-full text-xs font-semibold">
          Yard: {yard}
        </span>
      )}
      {lastTicket && (
        <span className="bg-cyan-700 text-cyan-100 px-3 py-1 rounded-full text-xs font-semibold">
          Last Ticket: {lastTicket}
        </span>
      )}
      {typeof aiRiskScore === "number" && (
        <span className="bg-cyan-600 text-cyan-50 px-3 py-1 rounded-full text-xs font-semibold">
          AI Risk: {aiRiskScore}
        </span>
      )}
    </div>
    {editable && (
      <button
        className="absolute top-2 right-2 bg-cyan-700 text-white rounded-full p-2 shadow hover:bg-cyan-400 transition"
        onClick={onEdit}
        title="Edit driver info"
      >
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" strokeWidth="2" d="M12 20h9" />
          <path
            stroke="currentColor"
            strokeWidth="2"
            d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5Z"
          />
        </svg>
      </button>
    )}
  </div>
);
