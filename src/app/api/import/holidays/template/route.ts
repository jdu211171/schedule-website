import { NextResponse } from "next/server";
import { CSVParser } from "@/lib/csv-parser";
import { HOLIDAY_CSV_HEADERS } from "@/schemas/import";

export async function GET() {
  try {
    // Get current year for sample data
    const currentYear = new Date().getFullYear();
    
    // Sample data for template
    const sampleData = [
      {
        name: "元日",
        startDate: `${currentYear}-01-01`,
        endDate: `${currentYear}-01-01`,
        isRecurring: "true",
        description: "新年の祝日"
      },
      {
        name: "ゴールデンウィーク",
        startDate: `${currentYear}-04-29`,
        endDate: `${currentYear}-05-05`,
        isRecurring: "false",
        description: "春の大型連休"
      },
      {
        name: "夏季休暇",
        startDate: `${currentYear}-08-13`,
        endDate: `${currentYear}-08-16`,
        isRecurring: "true",
        description: ""
      },
      {
        name: "年末年始休暇",
        startDate: `${currentYear}-12-29`,
        endDate: `${currentYear + 1}-01-03`,
        isRecurring: "true",
        description: "年末年始の休暇期間"
      }
    ];

    // Generate CSV with headers
    const csv = CSVParser.generateCSV(sampleData, [...HOLIDAY_CSV_HEADERS]);

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="holidays_template.csv"',
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