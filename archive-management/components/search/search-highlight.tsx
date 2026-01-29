"use client";

import React from "react";

interface SearchHighlightProps {
  text: string | null | undefined;
  query: string;
  maxLength?: number;
}

/**
 * Component to highlight search query matches in text
 * Supports partial matching - highlights text that contains query terms
 */
export function SearchHighlight({
  text,
  query,
  maxLength = 150,
}: SearchHighlightProps) {
  if (!text) {
    return <span className="text-gray-400">-</span>;
  }

  if (!query.trim()) {
    return <span>{text.length > maxLength ? `${text.slice(0, maxLength)}...` : text}</span>;
  }

  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // Try exact match first
  let matchIndex = textLower.indexOf(queryLower);

  // If no exact match, try partial matching
  // Check if any part of the query exists in the text
  if (matchIndex === -1) {
    // Split query into individual terms (for multi-word queries)
    const queryTerms = query.trim().split(/\s+/).filter(term => term.length > 1);

    // Find the first matching term
    for (const term of queryTerms) {
      const termIndex = textLower.indexOf(term.toLowerCase());
      if (termIndex !== -1) {
        matchIndex = termIndex;
        break;
      }
    }
  }

  if (matchIndex === -1) {
    // No match found at all, return truncated text
    return (
      <span>
        {text.length > maxLength ? `${text.slice(0, maxLength)}...` : text}
      </span>
    );
  }

  // Calculate snippet window around the match
  const windowSize = Math.floor((maxLength - query.length) / 2);
  let startIndex = Math.max(0, matchIndex - windowSize);
  let endIndex = Math.min(text.length, matchIndex + query.length + windowSize);

  // Add ellipsis if we're cutting the text
  const prefix = startIndex > 0 ? "..." : "";
  const suffix = endIndex < text.length ? "..." : "";

  // Extract the snippet
  const snippet = text.slice(startIndex, endIndex);

  // Escape special regex characters in query
  const escapeRegex = (str: string): string => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  // Split query into terms for highlighting
  const queryTerms = query.trim().split(/\s+/).filter(term => term.length > 1);

  // Create a regex pattern that matches any of the query terms
  // This allows highlighting even if only part of the query matches
  const patterns = queryTerms.map(term => escapeRegex(term));
  const regex = new RegExp(`(${patterns.join('|')})`, 'gi');

  // Split by all query terms and highlight matches
  const parts = snippet.split(regex);

  return (
    <span>
      {prefix}
      {parts.map((part, index) => {
        const partLower = part.toLowerCase();
        // Check if this part matches any of the query terms
        const isMatch = queryTerms.some(term =>
          partLower === term.toLowerCase() ||
          partLower.includes(term.toLowerCase()) ||
          term.toLowerCase().includes(partLower)
        );

        return isMatch ? (
          <mark key={index} className="bg-yellow-200 text-gray-900 px-0.5 rounded">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        );
      })}
      {suffix}
    </span>
  );
}
