"use client";

import { useState, useRef, useId } from "react";
import type { Deck } from "@/types";
import { useDecks } from "@/contexts/DecksContext";
import { parseDeck } from "@/lib/deckIO";
import ErrorState from "./ErrorState";

interface DuplicateResolutionState {
  importedDeck: Deck;
  existingDeck: Deck;
}

/**
 * ImportControl — imports a deck from a JSON file with validation and duplicate handling.
 *
 * Client Component: it manages file input, parsing, validation, and duplicate
 * resolution. All imported files are validated strictly against the canonical
 * Deck schema before touching the store. Malformed or invalid files fail
 * gracefully with a clear error message.
 *
 * Duplicate handling: if the imported deck's ID matches an existing deck, the
 * user is presented with an explicit choice to replace the existing deck or
 * import under a new ID. No silent overwrites.
 *
 * Accessibility: the file input has a label, error messages are announced as
 * alerts, and the duplicate modal has proper ARIA attributes.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5
 */
export default function ImportControl() {
  const { decks, addDeck, replaceDeck } = useDecks();
  const [error, setError] = useState<string | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] =
    useState<DuplicateResolutionState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Generates a unique ID by appending a timestamp to the original ID.
   */
  const generateUniqueId = (baseId: string): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${baseId}-import-${timestamp}-${random}`;
  };

  /**
   * Handles file selection and import.
   */
  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setError(null);

      // Read the file contents
      const fileContents = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result;
          if (typeof content === "string") {
            resolve(content);
          } else {
            reject(new Error("File read failed: invalid content type"));
          }
        };
        reader.onerror = () => {
          reject(new Error("File read failed: could not read the file"));
        };
        reader.readAsText(file);
      });

      // Parse and validate the file contents
      const parseResult = parseDeck(fileContents);
      if (!parseResult.ok) {
        setError(parseResult.error);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      const importedDeck = parseResult.data;

      // Check for duplicate ID
      const existingDeck = decks.find((d) => d.id === importedDeck.id);
      if (existingDeck) {
        // Show duplicate modal
        setIsDuplicateModalOpen({
          importedDeck,
          existingDeck,
        });
        return;
      }

      // No duplicate: add the deck directly
      const addResult = addDeck({
        id: importedDeck.id,
        name: importedDeck.name,
        description: importedDeck.description,
        cards: importedDeck.cards,
      });

      if (!addResult.ok) {
        setError(addResult.error.message);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      // Success: reset file input and clear error
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not read the file. Please try again.";
      setError(message);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  /**
   * Handles duplicate resolution: replace existing deck.
   */
  const handleReplace = () => {
    if (!isDuplicateModalOpen) {
      return;
    }

    const { importedDeck } = isDuplicateModalOpen;

    // Replace the old deck with the new one
    const replaceResult = replaceDeck(importedDeck);

    if (!replaceResult.ok) {
      setError(replaceResult.error.message);
    } else {
      setError(null);
    }

    setIsDuplicateModalOpen(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /**
   * Handles duplicate resolution: import with new ID.
   */
  const handleImportAsNew = () => {
    if (!isDuplicateModalOpen) {
      return;
    }

    const { importedDeck } = isDuplicateModalOpen;

    // Generate a new unique ID
    const newId = generateUniqueId(importedDeck.id);

    const addResult = addDeck({
      id: newId,
      name: importedDeck.name,
      description: importedDeck.description,
      cards: importedDeck.cards,
    });

    if (!addResult.ok) {
      setError(addResult.error.message);
    } else {
      setError(null);
    }

    setIsDuplicateModalOpen(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /**
   * Handles duplicate modal cancel.
   */
  const handleCancel = () => {
    setIsDuplicateModalOpen(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="import-file"
          className="text-sm font-medium text-aws-gray-900"
        >
          Import a deck from JSON
        </label>
        <input
          ref={fileInputRef}
          id="import-file"
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="block w-full text-sm text-aws-gray-900 file:mr-4 file:rounded-md file:border file:border-aws-blue file:bg-aws-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-aws-blue hover:file:bg-aws-gray-100"
        />
      </div>

      {error && (
        <ErrorState
          title="Import failed"
          message={error}
        />
      )}

      {isDuplicateModalOpen && (
        <DuplicateResolutionModal
          importedDeck={isDuplicateModalOpen.importedDeck}
          existingDeck={isDuplicateModalOpen.existingDeck}
          onReplace={handleReplace}
          onImportAsNew={handleImportAsNew}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}

interface DuplicateResolutionModalProps {
  importedDeck: Deck;
  existingDeck: Deck;
  onReplace: () => void;
  onImportAsNew: () => void;
  onCancel: () => void;
}

/**
 * DuplicateResolutionModal — shows when importing a deck with a duplicate ID.
 *
 * Presents both decks' information and offers the user an explicit choice to
 * replace the existing deck or import under a new ID.
 */
function DuplicateResolutionModal({
  importedDeck,
  existingDeck,
  onReplace,
  onImportAsNew,
  onCancel,
}: DuplicateResolutionModalProps) {
  const headingId = useId();
  const descriptionId = useId();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-aws-squid-ink/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={descriptionId}
        className="w-full max-w-md rounded-lg border border-aws-gray-200 bg-aws-white p-6 shadow-lg sm:p-8"
      >
        <h2
          id={headingId}
          className="text-xl font-semibold tracking-tight text-aws-gray-900"
        >
          Deck with ID &ldquo;{importedDeck.id}&rdquo; already exists
        </h2>
        <div id={descriptionId} className="mt-4 space-y-4 text-sm text-aws-gray-600">
          <div>
            <p className="font-medium text-aws-gray-900">Existing deck:</p>
            <p>
              <strong>{existingDeck.name}</strong> ({existingDeck.cards.length}{" "}
              cards)
            </p>
          </div>
          <div>
            <p className="font-medium text-aws-gray-900">Imported deck:</p>
            <p>
              <strong>{importedDeck.name}</strong> ({importedDeck.cards.length}{" "}
              cards)
            </p>
          </div>
          <p className="text-aws-gray-700">
            Would you like to replace the existing deck or import the deck under
            a new identifier?
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 items-center justify-center rounded-md border border-aws-gray-400 bg-aws-white px-6 text-sm font-semibold text-aws-gray-900 transition-colors hover:bg-aws-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onImportAsNew}
            className="inline-flex h-11 items-center justify-center rounded-md border border-aws-blue px-6 text-sm font-semibold text-aws-blue transition-colors hover:bg-aws-blue hover:text-aws-white"
          >
            Import as new
          </button>
          <button
            type="button"
            onClick={onReplace}
            className="inline-flex h-11 items-center justify-center rounded-md bg-aws-orange px-6 text-sm font-semibold text-aws-squid-ink transition-colors hover:bg-aws-orange-dark"
          >
            Replace
          </button>
        </div>
      </div>
    </div>
  );
}
