import Image from "next/image";

export default function FastScanBranding() {
  return (
    <div className="flex flex-col items-center">
      <Image
        src="/logo.png"
        alt="MoveAround TMS"
        width={160}
        height={48}
        className="h-12 w-auto mb-2"
      />
      <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-300">
        MoveAround FastScan™
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Automated Ticket OCR &amp; Pay Calculation
      </p>
    </div>
  );
}
