import { NextResponse } from "next/server";
import { CSVParser } from "@/lib/csv-parser";

export async function GET() {
  try {
    // Align template with export CSV shape (localized headers)
    // Export columns: ID, ブース名, 校舎, ステータス, 備考, 表示順
    const columns = ["ID", "ブース名", "校舎", "ステータス", "備考", "表示順"] as const;

    // Sample data for template (ID left empty for new rows)
    const sampleData = [
      {
        ID: "",
        ブース名: "ブース1",
        校舎: "メイン校",
        ステータス: "有効",
        備考: "",
        表示順: "1",
      },
      {
        ID: "",
        ブース名: "ブース2",
        校舎: "メイン校",
        ステータス: "有効",
        備考: "",
        表示順: "2",
      },
      {
        ID: "",
        ブース名: "会議室A",
        校舎: "サブ校",
        ステータス: "無効",
        備考: "",
        表示順: "3",
      },
    ];

    // Generate CSV with headers matching export
    const csv = CSVParser.generateCSV(sampleData, [...columns]);

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="booths_template.csv"',
      },
    });
  } catch (error) {
    console.error("Template generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate template" },
      { status: 500 }
    );
  }
}
