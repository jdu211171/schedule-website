import { NextResponse } from "next/server";
import { CSVParser } from "@/lib/csv-parser";
import { TEACHER_CSV_HEADERS } from "@/schemas/import";

export async function GET() {
  try {
    // Sample data for template
    const sampleData = [
      {
        username: "teacher1",
        email: "teacher1@example.com",
        password: "password123",
        name: "田中太郎",
        kanaName: "タナカタロウ",
        lineId: "line_tanaka",
        subjects: "数学,物理",
        subjectTypes: "個別指導,グループ指導",
        notes: "数学と物理の専門教師"
      },
      {
        username: "teacher2",
        email: "teacher2@example.com",
        password: "password456",
        name: "John Smith",
        kanaName: "ジョンスミス",
        lineId: "",
        subjects: "英語",
        subjectTypes: "個別指導",
        notes: "ネイティブ英語教師"
      }
    ];

    // Generate CSV with headers
    const csv = CSVParser.generateCSV(sampleData, [...TEACHER_CSV_HEADERS]);

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="teachers_template.csv"',
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