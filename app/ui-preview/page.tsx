"use client";

import { useState } from "react";
import { Spinner } from "../components/ui/spinner";
import { Progress } from "../components/ui/progress";
import { SimpleTabs } from "../components/ui/simple-tabs";
import { SimpleSelect } from "../components/ui/simple-select";
import { LoadingOverlay } from "../components/ui/loading-overlay";
import { useLoading } from "../components/ui/providers/use-loading";

export default function UiPreviewPage() {
  const [progress, setProgress] = useState(40);
  const [option, setOption] = useState("Option A");
  const [showOverlay, setShowOverlay] = useState(false);
  const { showLoading, hideLoading } = useLoading();

  const handleShowOverlay = () => {
    setShowOverlay(true);
    // Auto hide after 3 seconds
    setTimeout(() => setShowOverlay(false), 3000);
  };

  const handleGlobalLoading = () => {
    showLoading("Fetching data...");
    setTimeout(hideLoading, 2000);
  };

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-blue-600 mb-2">
          🚛 MoveAround TMS
        </h1>
        <h2 className="text-2xl text-gray-700">UI Components Preview</h2>
        <p className="text-gray-600 mt-2">Professional fleet management interface components</p>
      </div>

      {/* Spinner */}
      <section className="bg-white p-6 rounded-lg shadow-md border">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">🔄 Spinner Components</h2>
        <div className="flex gap-8 items-center flex-wrap">
          <div className="text-center">
            <Spinner size="sm" />
            <p className="text-xs text-gray-600 mt-2">Small</p>
          </div>
          <div className="text-center">
            <Spinner size="md" />
            <p className="text-xs text-gray-600 mt-2">Medium</p>
          </div>
          <div className="text-center">
            <Spinner size="lg" />
            <p className="text-xs text-gray-600 mt-2">Large</p>
          </div>
          <div className="text-center">
            <Spinner size="md" color="text-green-600" label="Loading drivers..." />
            <p className="text-xs text-gray-600 mt-2">With Label</p>
          </div>
        </div>
      </section>

      {/* Progress Bar */}
      <section className="bg-white p-6 rounded-lg shadow-md border">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">📊 Progress Bar</h2>
        <div className="space-y-4">
          <Progress value={progress} className="w-full" />
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setProgress((p) => Math.max(0, p - 10))}
              className="bg-gray-300 hover:bg-gray-400 px-3 py-1 rounded text-sm"
            >
              Decrease
            </button>
            <span className="text-sm text-gray-600 min-w-[60px]">{progress}%</span>
            <button
              onClick={() => setProgress((p) => Math.min(100, p + 10))}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
            >
              Increase
            </button>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="bg-white p-6 rounded-lg shadow-md border">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">📑 Navigation Tabs</h2>
        <SimpleTabs 
          tabs={["Dashboard", "Drivers", "Fleet", "Reports"]} 
          onTabChange={(tab) => console.log('Tab selected:', tab)}
        />
      </section>

      {/* Select */}
      <section className="bg-white p-6 rounded-lg shadow-md border">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">🎯 Select Dropdown</h2>
        <div className="space-y-4">
          <SimpleSelect
            options={["All Drivers", "Active Drivers", "Inactive Drivers", "Pending Verification"]}
            value={option}
            onChange={setOption}
            placeholder="Select driver status..."
          />
          <p className="text-sm text-gray-600">
            <strong>Selected:</strong> {option}
          </p>
        </div>
      </section>

      {/* Loading Overlay */}
      <section className="bg-white p-6 rounded-lg shadow-md border">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">🌫️ Loading Overlays</h2>
        <div className="flex gap-4 flex-wrap">
          <button
            onClick={handleShowOverlay}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Show Local Overlay (3s)
          </button>
          <button
            onClick={handleGlobalLoading}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Trigger Global Overlay (2s)
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Local overlay shows above this page only. Global overlay covers the entire application.
        </p>
        
        {/* Local loading overlay */}
        <LoadingOverlay
          show={showOverlay}
          label="Testing local overlay..."
        />
      </section>

      {/* Feature Summary */}
      <section className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">✨ Component Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-medium text-blue-600 mb-2">🎨 Design System</h3>
            <ul className="space-y-1 text-gray-600">
              <li>• Consistent color palette</li>
              <li>• Professional styling</li>
              <li>• Responsive layouts</li>
              <li>• Accessibility support</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-purple-600 mb-2">⚡ Performance</h3>
            <ul className="space-y-1 text-gray-600">
              <li>• Lightweight components</li>
              <li>• Fast load times</li>
              <li>• Smooth animations</li>
              <li>• TypeScript support</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
