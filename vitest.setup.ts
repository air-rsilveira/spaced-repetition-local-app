import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";

// Keep each test isolated: clear persisted state and any spies/mocks
// between tests so localStorage-backed behavior starts from a clean slate.
beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});
