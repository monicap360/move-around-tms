export default function FastScanResults() {
  // TODO: Display real-time OCR results for selected ticket
  return (
    <div className="bg-white dark:bg-gray-800 rounded shadow p-4">
      <h3 className="font-semibold mb-2">OCR Results</h3>
      {/* Example result */}
      <div className="mb-2">
        <span className="font-bold">Material:</span> Flex Base
      </div>
      <div className="mb-2">
        <span className="font-bold">Tons:</span> 22.5
      </div>
      <div className="mb-2">
        <span className="font-bold">Price/Ton:</span> $12.50
      </div>
      <div className="mb-2">
        <span className="font-bold">Total:</span> $281.25
      </div>
      <div className="mb-2">
        <span className="font-bold">Plant:</span> TX-Plant-1
      </div>
      <div className="mb-2">
        <span className="font-bold">Customer:</span> ACME Construction
      </div>
      <div className="mb-2">
        <span className="font-bold">Status:</span> <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">Complete</span>
      </div>
    </div>
  );
}
