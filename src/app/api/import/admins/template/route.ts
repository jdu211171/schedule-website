import { NextResponse } from "next/server";
import { CSVParser } from "@/lib/csv-parser";
import { ADMIN_CSV_HEADERS } from "@/schemas/import";

export async function GET() {
  try {
    // Sample data for template
    const sampleData = [
      {
        username: "admin1",
        email: "admin1@example.com",
        password: "password123",
        name: "管理者1",
        isRestrictedAdmin: "false",
        branchNames: "東京校,大阪校"
      },
      {
        username: "admin2",
        email: "admin2@example.com",
        password: "password456",
        name: "管理者2",
        isRestrictedAdmin: "true",
        branchNames: "東京校"
      }
    ];

    // Generate CSV with headers
    const csv = CSVParser.generateCSV(sampleData, [...ADMIN_CSV_HEADERS]);

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="admins_template.csv"',
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