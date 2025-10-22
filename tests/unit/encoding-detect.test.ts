import { describe, it, expect } from "vitest";
import iconv from "iconv-lite";
import { CSVParser } from "@/lib/csv-parser";

describe("CSVParser encoding detection", () => {
  it("parses UTF-8 with BOM correctly", async () => {
    const bom = "\uFEFF";
    const csv = `${bom}ID,名前\n1,太郎\n`;
    const buffer = Buffer.from(csv, "utf-8");
    const res = await CSVParser.parseBuffer<Record<string, string>>(buffer);
    expect(res.errors).toEqual([]);
    expect(res.data.length).toBe(1);
    expect(res.data[0]["ID"]).toBe("1");
    expect(res.data[0]["名前"]).toBe("太郎");
  });

  it("auto-detects and parses Shift_JIS content", async () => {
    const csvUtf = `名前,ユーザー名\n太郎,taro\n`;
    const buffer = iconv.encode(csvUtf, "Shift_JIS");
    const res = await CSVParser.parseBuffer<Record<string, string>>(buffer, {
      encoding: "utf-8",
    });
    expect(res.errors).toEqual([]);
    expect(res.data.length).toBe(1);
    expect(res.data[0]["名前"]).toBe("太郎");
    expect(res.data[0]["ユーザー名"]).toBe("taro");
  });
});
