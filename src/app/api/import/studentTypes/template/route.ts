import { NextResponse } from "next/server";
import { CSVParser } from "@/lib/csv-parser";
import { STUDENT_TYPE_CSV_HEADERS } from "@/schemas/import";

export async function GET() {
  try {
    // Sample data for template
    const sampleData = [
      {
        name: "高校生",
        maxYears: "3",
        description: "高校1年生から3年生まで",
        order: "1",
      },
      {
        name: "中学生",
        maxYears: "3",
        description: "中学1年生から3年生まで",
        order: "2",
      },
      {
        name: "小学生",
        maxYears: "6",
        description: "",
        order: "3",
      },
    ];

    // Generate CSV with headers
    const csv = CSVParser.generateCSV(sampleData, [
      ...STUDENT_TYPE_CSV_HEADERS,
    ]);

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="student_types_template.csv"',
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
