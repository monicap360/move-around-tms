export default function StyleTest() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-blue-900 text-white p-4 mb-4">
        <h1 className="text-2xl font-bold">Style Test - Blue Background</h1>
        <p>If you can see this with a blue background, Tailwind is working</p>
      </div>
      
      <div className="flex h-96">
        <div className="w-72 bg-blue-900 text-white p-4">
          <h2 className="text-lg font-semibold mb-4">Sidebar Test</h2>
          <nav className="space-y-2">
            <div className="bg-blue-800 px-3 py-2 rounded">Dashboard</div>
            <div className="hover:bg-blue-800 px-3 py-2 rounded cursor-pointer">Reports</div>
            <div className="hover:bg-blue-800 px-3 py-2 rounded cursor-pointer">Settings</div>
          </nav>
        </div>
        
        <div className="flex-1 bg-white p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Main Content Area</h2>
          <p className="text-gray-700 mb-4">This should be the main content area with:</p>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li>White background</li>
            <li>Gray text</li>
            <li>Proper spacing</li>
            <li>Responsive layout</li>
          </ul>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900">Card 1</h3>
              <p className="text-blue-700">Test card styling</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900">Card 2</h3>
              <p className="text-green-700">Test card styling</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900">Card 3</h3>
              <p className="text-yellow-700">Test card styling</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
