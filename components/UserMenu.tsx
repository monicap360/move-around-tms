"use client";

// import { useAuth } from "../contexts/AuthContext"; // 🚨 REMOVED - Authentication disabled
import { useState } from "react";
import { User, LogOut, Settings } from "lucide-react";

export function UserMenu() {
  // const { user, signOut } = useAuth(); // 🚨 REMOVED - Authentication disabled
  const [isOpen, setIsOpen] = useState(false);

  // 🚨 DEMO USER MODE - Always show menu
  const user = { email: "demo@movearoundtms.com", name: "Demo User" };

  // if (!user) return null; // 🚨 REMOVED - Always show menu now

  const handleSignOut = async () => {
    // No sign out needed - just refresh since there's no authentication
    window.location.reload();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
      >
        <User className="w-4 h-4" />
        <span className="text-xs">{user.email?.split("@")[0]}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
          <div className="py-1">
            <div className="px-4 py-2 text-sm text-gray-700 border-b">
              <div className="font-medium">{user.email}</div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
