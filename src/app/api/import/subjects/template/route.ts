import { NextResponse } from "next/server";
import { CSVParser } from "@/lib/csv-parser";
import { SUBJECT_CSV_HEADERS } from "@/schemas/import";

export async function GET() {
  try {
    // Sample data for template
    const sampleData = [
      {
        name: "数学",
        notes: "基礎から応用まで",
      },
      {
        name: "英語",
        notes: "文法・読解・リスニング",
      },
      {
        name: "物理",
        notes: "",
      },
    ];

    // Generate CSV with headers
    const csv = CSVParser.generateCSV(sampleData, [...SUBJECT_CSV_HEADERS]);

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="subjects_template.csv"',
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
