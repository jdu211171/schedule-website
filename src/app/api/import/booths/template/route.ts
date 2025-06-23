import { NextResponse } from "next/server";
import { CSVParser } from "@/lib/csv-parser";
import { BOOTH_CSV_HEADERS } from "@/schemas/import";

export async function GET() {
  try {
    // Sample data for template
    const sampleData = [
      {
        name: "ブース1",
        status: "true",
        branchName: "メイン校",
        order: "1"
      },
      {
        name: "ブース2",
        status: "true",
        branchName: "メイン校",
        order: "2"
      },
      {
        name: "会議室A",
        status: "false",
        branchName: "サブ校",
        order: "3"
      }
    ];

    // Generate CSV with headers
    const csv = CSVParser.generateCSV(sampleData, [...BOOTH_CSV_HEADERS]);

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