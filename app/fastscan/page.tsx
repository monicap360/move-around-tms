import FastScanUpload from "../components/FastScanUpload";
import FastScanHistory from "../components/FastScanHistory";
import FastScanResults from "../components/FastScanResults";
import FastScanBranding from "../components/FastScanBranding";

export default function FastScanPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center py-8">
      <FastScanBranding />
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        <div>
          <FastScanUpload />
          <div className="mt-8">
            <FastScanHistory />
          </div>
        </div>
        <div>
          <FastScanResults />
        </div>
      </div>
    </div>
  );
}
