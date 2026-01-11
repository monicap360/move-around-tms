"use client";
import { useState } from "react";

export default function DriverAI({ driver }) {
  const [suggestion, setSuggestion] = useState(
    "All systems normal. Drive safe!",
  );

  // Simulate AI suggestions
  function getSuggestion() {
    const suggestions = [
      "Consider a break in 30 minutes.",
      "Fuel level is optimal.",
      "Watch for icy roads ahead.",
      "All systems normal. Drive safe!",
    ];
    setSuggestion(suggestions[Math.floor(Math.random() * suggestions.length)]);
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Driver AI</h2>
      <div className="mb-2">{suggestion}</div>
      <button
        className="px-3 py-1 bg-green-600 rounded"
        onClick={getSuggestion}
      >
        Get AI Suggestion
      </button>
    </div>
  );
}
