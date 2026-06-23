"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck, Star, Users, Plus, ChevronDown } from "lucide-react";

interface SavedView {
  id: string;
  name: string;
  description?: string;
  is_shared: boolean;
  is_quick_filter: boolean;
  quick_filter_type?: string;
  filters: Record<string, any>;
}

interface SavedViewsDropdownProps {
  currentFilters: Record<string, any>;
  onSelectView: (filters: Record<string, any>) => void;
  onSaveView?: () => void;
  userId?: string;
  organizationId?: string;
}

export default function SavedViewsDropdown({
  currentFilters,
  onSelectView,
  onSaveView,
  userId,
  organizationId,
}: SavedViewsDropdownProps) {
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSavedViews = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        user_id: userId,
        include_shared: "true",
      });
      if (organizationId) {
        params.append("organization_id", organizationId);
      }

      const res = await fetch(`/api/tickets/views?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSavedViews(data.views || []);
      }
    } catch (err) {
      console.error("Error loading saved views:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, organizationId]);

  useEffect(() => {
    if (userId) {
      loadSavedViews();
    }
  }, [userId, loadSavedViews]);

  async function deleteView(viewId: string) {
    try {
      const res = await fetch(`/api/tickets/views/${viewId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSavedViews((views) => views.filter((v) => v.id !== viewId));
      }
    } catch (err) {
      console.error("Error deleting view:", err);
    }
  }

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const quickFilters = savedViews.filter((v) => v.is_quick_filter);
  const customViews = savedViews.filter((v) => !v.is_quick_filter);

  const quickFilterLabels: Record<string, string> = {
    needs_attention: "Needs Attention",
    disputed: "Disputed",
    overdue: "Overdue",
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        className="gap-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bookmark className="w-4 h-4" />
        Saved Views
        <ChevronDown className="w-4 h-4" />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="py-1">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
              Quick Filters
            </div>
            {quickFilters.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-400">
                No quick filters available
              </div>
            )}
            {quickFilters.map((view) => (
              <button
                key={view.id}
                onClick={() => {
                  onSelectView(view.filters);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
              >
                <Star className="w-4 h-4 text-yellow-500" />
                {quickFilterLabels[view.quick_filter_type || ""] || view.name}
              </button>
            ))}

            {customViews.length > 0 && (
              <>
                <div className="border-t border-gray-200 my-1" />
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                  My Views
                </div>
                {customViews.map((view) => (
                  <button
                    key={view.id}
                    onClick={() => {
                      onSelectView(view.filters);
                      setIsOpen(false);
                    }}
                    className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
                  >
                    <BookmarkCheck className="w-4 h-4" />
                    <span className="flex-1">{view.name}</span>
                    {view.is_shared && (
                      <Users className="w-3 h-3 text-blue-500" />
                    )}
                  </button>
                ))}
              </>
            )}

            {onSaveView && (
              <>
                <div className="border-t border-gray-200 my-1" />
                <button
                  onClick={() => {
                    onSaveView();
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Save Current View
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
