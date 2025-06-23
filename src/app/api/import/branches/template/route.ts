import { NextResponse } from "next/server";
import { CSVParser } from "@/lib/csv-parser";
import { BRANCH_CSV_HEADERS } from "@/schemas/import";

export async function GET() {
  try {
    // Sample data for template
    const sampleData = [
      {
        name: "東京校",
        notes: "メインキャンパス",
        order: "1"
      },
      {
        name: "大阪校",
        notes: "関西エリアの拠点",
        order: "2"
      }
    ];

    // Generate CSV with headers
    const csv = CSVParser.generateCSV(sampleData, [...BRANCH_CSV_HEADERS]);

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="branches_template.csv"',
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