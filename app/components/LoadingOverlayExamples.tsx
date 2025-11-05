import { useState } from "react";
import { LoadingOverlay } from "./ui/loading-overlay";

export default function LoadingOverlayExamples() {
  const [loginLoading, setLoginLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  const simulateLogin = async () => {
    setLoginLoading(true);
    // Simulate API call
    setTimeout(() => setLoginLoading(false), 3000);
  };

  const simulateUpload = async () => {
    setUploadLoading(true);
    // Simulate file upload
    setTimeout(() => setUploadLoading(false), 5000);
  };

  const simulateDataFetch = async () => {
    setDataLoading(true);
    // Simulate data fetching
    setTimeout(() => setDataLoading(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold mb-8">MoveAround TMS - Loading Overlay Examples</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl">
        {/* Login Example */}
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h3 className="font-semibold mb-4">Authentication</h3>
          <button
            onClick={simulateLogin}
            disabled={loginLoading}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loginLoading ? "Signing In..." : "Sign In"}
          </button>
        </div>

        {/* Upload Example */}
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h3 className="font-semibold mb-4">File Upload</h3>
          <button
            onClick={simulateUpload}
            disabled={uploadLoading}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {uploadLoading ? "Uploading..." : "Upload Files"}
          </button>
        </div>

        {/* Data Fetch Example */}
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h3 className="font-semibold mb-4">Data Loading</h3>
          <button
            onClick={simulateDataFetch}
            disabled={dataLoading}
            className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {dataLoading ? "Loading..." : "Fetch Data"}
          </button>
        </div>
      </div>

      {/* Loading Overlays */}
      <LoadingOverlay show={loginLoading} label="Authenticating user..." />
      <LoadingOverlay show={uploadLoading} label="Uploading files to server..." />
      <LoadingOverlay show={dataLoading} label="Fetching driver data..." />
    </div>
  );
}

// More usage examples:

/*
// 1. Simple loading overlay
<LoadingOverlay show={isLoading} />

// 2. Custom message
<LoadingOverlay show={isProcessing} label="Processing your request..." />

// 3. In a form submission
const handleSubmit = async (data) => {
  setLoading(true);
  try {
    await submitForm(data);
  } finally {
    setLoading(false);
  }
};

// 4. In a data fetch
useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await fetchDrivers();
      setDrivers(data);
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, []);

// 5. Multiple loading states (only show one at a time)
<LoadingOverlay show={isLoggingIn} label="Signing you in..." />
<LoadingOverlay show={isUploading} label="Uploading documents..." />
<LoadingOverlay show={isSaving} label="Saving changes..." />
*/
