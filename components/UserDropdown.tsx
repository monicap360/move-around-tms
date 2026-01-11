"use client";
import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { User, Settings, LogOut, ChevronDown } from "lucide-react";

interface UserDropdownProps {
  user?: any;
  isAdmin?: boolean;
  onSignOut?: () => void;
}

export default function UserDropdown({
  user,
  isAdmin,
  onSignOut,
}: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get user display name and initials - check profile first, then metadata
  const displayName =
    user?.profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email ||
    "User";
  const avatarUrl =
    user?.profile?.avatar_url || user?.user_metadata?.avatar_url;

  const getInitials = () => {
    const name = user?.profile?.full_name || user?.user_metadata?.full_name;
    if (name) {
      return name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProfileClick = () => {
    setIsOpen(false);
    window.location.href = "/profile";
  };

  const handleSignOut = () => {
    setIsOpen(false);
    onSignOut?.();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* User Button */}
      <Button
        variant="ghost"
        className="flex items-center gap-2 px-3 py-2 h-auto"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Avatar className="w-8 h-8">
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            {getInitials()}
          </AvatarFallback>
        </Avatar>

        <div className="hidden sm:block text-left">
          <div className="text-sm font-medium text-gray-900">
            {displayName.length > 20
              ? `${displayName.slice(0, 20)}...`
              : displayName}
          </div>
          {isAdmin && (
            <div className="text-xs text-yellow-600 font-medium">
              Administrator
            </div>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {displayName}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {user?.email}
                </div>
                {isAdmin && (
                  <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                    👑 Admin
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <button
              onClick={() => {
                setIsOpen(false);
                window.location.href = "/settings";
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              Profile Settings
            </button>

            {isAdmin && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = "/dashboard#admin-management";
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Admin Panel
              </button>
            )}
          </div>

          {/* Sign Out */}
          <div className="border-t border-gray-100 py-2">
            <button
              onClick={handleSignOut}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
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
