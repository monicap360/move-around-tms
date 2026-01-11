export default function FastScanHistory() {
  // TODO: Fetch and display recent ticket uploads
  return (
    <div className="bg-white dark:bg-gray-800 rounded shadow p-4">
      <h3 className="font-semibold mb-2">Ticket History</h3>
      <ul className="space-y-2">
        {/* Example ticket */}
        <li className="flex justify-between items-center">
          <span>IMG_20251122_203244.jpg</span>
          <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
            OCR Complete
          </span>
        </li>
        <li className="flex justify-between items-center">
          <span>IMG_20251121_184512.jpg</span>
          <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs">
            Processing
          </span>
        </li>
      </ul>
    </div>
  );
}
