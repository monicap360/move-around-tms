/* eslint-disable @next/next/no-img-element */
export default function TruckPreview({ truck_skin, custom_logo_url }) {
  return (
    <div className="mt-4 text-center">
      <img
        src={`/truck-skins/${truck_skin}.png`}
        alt="Truck Preview"
        className="w-full max-w-md mx-auto"
      />
      {custom_logo_url && (
        <img
          src={custom_logo_url}
          className="w-24 h-24 mx-auto mt-4 opacity-90"
          alt="Custom Logo"
        />
      )}
    </div>
  );
}
