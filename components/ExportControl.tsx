"use client";

import { useState } from "react";
import type { Deck } from "@/types";
import { serializeDeck } from "@/lib/deckIO";

interface ExportControlProps {
  deck: Deck;
  onExportStart?: () => void;
  onExportEnd?: () => void;
}

/**
 * ExportControl — exports a single deck as a downloadable JSON file.
 *
 * Client Component: it serializes the deck to JSON, creates a Blob, and
 * triggers a browser download. The download is named `<deck-id>.json`
 * so users can easily identify and organize exported decks.
 *
 * On error, displays an inline error message. Errors are handled gracefully
 * without throwing, so the app remains stable.
 *
 * Accessibility: the export button has an `aria-label` that includes the
 * deck name so screen-reader users can tell which deck is being exported.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
export default function ExportControl({
  deck,
  onExportStart,
  onExportEnd,
}: ExportControlProps) {
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setError(null);
    setIsExporting(true);

    try {
      if (onExportStart) {
        onExportStart();
      }

      // Serialize the deck to JSON
      const json = serializeDeck(deck);

      // Create a Blob from the JSON string
      const blob = new Blob([json], { type: "application/json" });

      // Create an object URL for the Blob
      const url = URL.createObjectURL(blob);

      // Create a temporary anchor element to trigger the download
      const link = document.createElement("a");
      link.href = url;
      link.download = `${deck.id}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Revoke the object URL to free memory
      URL.revokeObjectURL(url);

      if (onExportEnd) {
        onExportEnd();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Export failed. Please try again.";
      setError(message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleExport}
        disabled={isExporting}
        aria-label={`Export deck: ${deck.name}`}
        className="rounded-md border border-aws-blue px-3 py-1.5 text-sm font-medium text-aws-blue transition-colors hover:bg-aws-blue hover:text-aws-white disabled:opacity-50 disabled:cursor-not-allowed sm:px-4"
      >
        {isExporting ? "Exporting…" : "Export"}
      </button>
      {error && (
        <p className="text-sm text-aws-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
