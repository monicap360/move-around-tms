import { Spinner } from "../components/ui";

export default function DashboardLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <Spinner size="lg" label="Loading dashboard..." />
      <p className="mt-4 text-gray-600">
        Please wait while we prepare your data
      </p>
    </div>
  );
}

// Example usage in other components:

/*
// Loading state in a form
<button disabled={loading} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md">
  {loading ? <Spinner size="sm" color="text-white" /> : "Save Changes"}
</button>

// Full page loading
{loading ? (
  <div className="flex flex-col items-center justify-center min-h-screen">
    <Spinner size="lg" label="Loading..." />
  </div>
) : (
  <MainContent />
)}

// Inline loading for cards or sections
<div className="p-4 border rounded-lg">
  {isLoading ? (
    <div className="flex justify-center">
      <Spinner size="md" label="Loading data..." />
    </div>
  ) : (
    <DataContent />
  )}
</div>
*/
