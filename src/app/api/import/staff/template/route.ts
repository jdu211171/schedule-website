import { NextResponse } from "next/server";
import { CSVParser } from "@/lib/csv-parser";
import { STAFF_CSV_HEADERS } from "@/schemas/import";

export async function GET() {
  try {
    // Sample data for template
    const sampleData = [
      {
        username: "staff1",
        email: "staff1@example.com",
        password: "password123",
        name: "スタッフ1",
        branchNames: "東京校",
      },
      {
        username: "staff2",
        email: "staff2@example.com",
        password: "password456",
        name: "スタッフ2",
        branchNames: "東京校,大阪校",
      },
    ];

    // Generate CSV with headers
    const csv = CSVParser.generateCSV(sampleData, [...STAFF_CSV_HEADERS]);

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="staff_template.csv"',
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
