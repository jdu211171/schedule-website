import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("OpenAPI contract for CSV Import API", () => {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const openapiPath = path.join(
    repoRoot,
    "specs",
    "015-i-m-using",
    "contracts",
    "openapi.yaml"
  );

  it("contains /api/import/csv POST and session path", () => {
    const text = fs.readFileSync(openapiPath, "utf-8");
    expect(text).toContain("/api/import/csv:");
    expect(text).toContain("post:");
    expect(text).toContain("/api/import/sessions/{id}:");
    expect(text).toContain("get:");
  });

  it("defines ImportResult and ImportSession schemas", () => {
    const text = fs.readFileSync(openapiPath, "utf-8");
    expect(text).toContain("ImportResult:");
    expect(text).toContain("ImportSession:");
    expect(text).toContain("processed:");
    expect(text).toContain("status:");
  });
});

