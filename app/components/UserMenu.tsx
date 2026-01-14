"use client";

import { useState } from "react";
import { User, LogOut, Settings } from "lucide-react";

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);

  // Production user - Ronyx Logistics LLC operator
  const user = { email: "operator@ronyx.com", name: "Operator" };

  const handleSignOut = async () => {
    window.location.reload();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-sm text-text-secondary hover:text-gold-primary hover:bg-space-surface transition-all duration-150 border border-transparent hover:border-space-border"
      >
        <User className="w-4 h-4" strokeWidth={1.5} />
        <span className="text-xs tracking-wide uppercase">{user.name}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-space-panel rounded-sm border border-space-border z-50">
          <div className="py-1">
            <div className="px-4 py-2 text-xs text-text-secondary border-b border-space-border">
              <div className="font-medium text-text-primary">{user.email}</div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 w-full px-4 py-2 text-xs text-text-secondary hover:bg-space-surface hover:text-text-primary transition-colors"
            >
              <Settings className="w-3.5 h-3.5" strokeWidth={1.5} />
              Settings
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full px-4 py-2 text-xs text-status-error hover:bg-space-surface transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
