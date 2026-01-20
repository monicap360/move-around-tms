import Image from "next/image";

const directImageLoader = ({ src }: { src: string }) => src;

export default function TruckPreview({ truck_skin, custom_logo_url }) {
  return (
    <div className="mt-4 text-center">
      <Image
        src={`/truck-skins/${truck_skin}.png`}
        alt="Truck Preview"
        width={640}
        height={320}
        className="w-full max-w-md mx-auto"
      />
      {custom_logo_url && (
        <Image
          src={custom_logo_url}
          className="w-24 h-24 mx-auto mt-4 opacity-90"
          alt="Custom Logo"
          width={96}
          height={96}
          loader={directImageLoader}
          unoptimized
        />
      )}
    </div>
  );
}
