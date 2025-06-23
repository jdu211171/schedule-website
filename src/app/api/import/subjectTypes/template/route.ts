import { NextResponse } from "next/server";
import { CSVParser } from "@/lib/csv-parser";
import { SUBJECT_TYPE_CSV_HEADERS } from "@/schemas/import";

export async function GET() {
  try {
    // Sample data for template
    const sampleData = [
      {
        name: "必修科目",
        notes: "全生徒が受講する必要がある科目",
        order: "1"
      },
      {
        name: "選択科目",
        notes: "生徒が選んで受講できる科目",
        order: "2"
      },
      {
        name: "特別講座",
        notes: "",
        order: "3"
      }
    ];

    // Generate CSV with headers
    const csv = CSVParser.generateCSV(sampleData, [...SUBJECT_TYPE_CSV_HEADERS]);

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="subject_types_template.csv"',
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