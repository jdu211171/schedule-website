import { describe, it, expect } from "vitest";
import { CSVParser } from "@/lib/csv-parser";

describe("CSVParser CSV behaviors", () => {
  it("handles quoted commas and quotes", async () => {
    const csv = `text\n"Hello, ""world"""\n`;
    const buffer = Buffer.from(csv, "utf-8");
    const res = await CSVParser.parseBuffer<Record<string, string>>(buffer);
    expect(res.errors).toEqual([]);
    expect(res.data.length).toBe(1);
    expect(res.data[0]["text"]).toBe('Hello, "world"');
  });

  it("handles multiline fields", async () => {
    const csv = `text\n"line1\nline2"\n`;
    const buffer = Buffer.from(csv, "utf-8");
    const res = await CSVParser.parseBuffer<Record<string, string>>(buffer);
    expect(res.errors).toEqual([]);
    expect(res.data.length).toBe(1);
    expect(res.data[0]["text"]).toBe("line1\nline2");
  });
});
