import React from "react";

export interface DriverPhotoProps {
  photoUrl?: string;
  name?: string;
  size?: number;
  editable?: boolean;
  onChangePhoto?: () => void;
}

export const DriverPhoto: React.FC<DriverPhotoProps> = ({ photoUrl, name, size = 120, editable, onChangePhoto }) => (
  <div className="relative flex flex-col items-center">
    <div
      className="rounded-full border-4 border-cyan-400 shadow-lg bg-gray-900 overflow-hidden flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={name || "Driver photo"}
          className="object-cover w-full h-full"
        />
      ) : (
        <span className="text-cyan-300 text-4xl font-bold opacity-60">{name?.[0] || "?"}</span>
      )}
      {editable && (
        <button
          className="absolute bottom-2 right-2 bg-cyan-600 text-white rounded-full p-2 shadow hover:bg-cyan-400 transition"
          onClick={onChangePhoto}
          title="Change photo"
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M12 20h9"/><path stroke="currentColor" strokeWidth="2" d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5Z"/></svg>
        </button>
      )}
    </div>
    {name && <div className="mt-2 text-cyan-200 font-semibold text-lg text-center">{name}</div>}
  </div>
);
