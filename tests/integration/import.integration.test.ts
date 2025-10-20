// @vitest-environment node
import { describe, it } from "vitest";

// Integration tests for import endpoints are environment-dependent (Next.js runtime
// and DB). Skipping by default to avoid interfering with unrelated suites.

describe.skip("CSV Import integration (requires Next runtime + DB)", () => {
  it("imports a small valid CSV and returns a success summary", async () => {
    // Intended flow:
    // 1. Spin up API route handler (Next test harness) or call deployed preview
    // 2. POST multipart form-data with CSV
    // 3. Expect JSON result with processed/created counts and zero errors
  });

  it("returns detailed errors for invalid rows and processes valid rows", async () => {
    // Intended flow similar to above, with mixed valid/invalid rows
  });
});
