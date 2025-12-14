import React from "react";

export interface TruckLogoBadgeProps {
  logoUrl?: string;
  size?: number;
  editable?: boolean;
  onChangeLogo?: () => void;
}

export const TruckLogoBadge: React.FC<TruckLogoBadgeProps> = ({ logoUrl, size = 64, editable, onChangeLogo }) => (
  <div className="relative flex flex-col items-center">
    <div
      className="rounded-full bg-gradient-to-br from-cyan-500 via-cyan-700 to-cyan-900 shadow-xl border-4 border-cyan-300 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt="Truck logo"
          className="object-contain w-3/4 h-3/4 drop-shadow-lg"
        />
      ) : (
        <span className="text-cyan-100 text-2xl font-bold opacity-60">🚚</span>
      )}
      {editable && (
        <button
          className="absolute bottom-1 right-1 bg-cyan-700 text-white rounded-full p-1 shadow hover:bg-cyan-400 transition"
          onClick={onChangeLogo}
          title="Change logo"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M12 20h9"/><path stroke="currentColor" strokeWidth="2" d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5Z"/></svg>
        </button>
      )}
    </div>
    <div className="mt-1 text-xs text-cyan-300 font-medium">Truck Logo</div>
  </div>
);
