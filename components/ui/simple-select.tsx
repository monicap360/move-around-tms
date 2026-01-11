"use client";

import React, { useState } from "react";

interface SimpleSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SimpleSelect({
  options,
  value,
  onChange,
  placeholder,
}: SimpleSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full max-w-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <span className="block truncate">
          {value || placeholder || "Select option"}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <ul className="py-1 text-sm text-gray-700">
            {options.map((option) => (
              <li key={option}>
                <button
                  onClick={() => handleSelect(option)}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-100 ${
                    value === option ? "bg-blue-100 text-blue-700" : ""
                  }`}
                >
                  {option}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
