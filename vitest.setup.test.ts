import { describe, expect, it } from "vitest";

// Importing via the `@/*` alias confirms the Test_Harness resolves the alias
// consistently with the Next.js build (Requirements 8.3, 8.4).
import * as types from "@/types";

describe("test harness smoke test", () => {
  it("resolves the @/ path alias and runs assertions", () => {
    expect(types).toBeDefined();
    expect(1 + 1).toBe(2);
  });
});
