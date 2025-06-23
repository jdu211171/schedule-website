import { NextResponse } from "next/server";
import { CSVParser } from "@/lib/csv-parser";
import { STUDENT_CSV_HEADERS } from "@/schemas/import";

export async function GET() {
  try {
    // Sample data for template
    const sampleData = [
      {
        username: "student1",
        email: "student1@example.com",
        password: "password123",
        name: "山田花子",
        kanaName: "ヤマダハナコ",
        studentTypeName: "高校生",
        gradeYear: "2",
        lineId: "line_hanako",
        notes: "成績優秀",
        subjects: "数学,英語"
      },
      {
        username: "student2",
        email: "student2@example.com",
        password: "password456",
        name: "鈴木一郎",
        kanaName: "スズキイチロウ",
        studentTypeName: "中学生",
        gradeYear: "1",
        lineId: "",
        notes: "",
        subjects: "国語,理科,社会"
      }
    ];

    // Generate CSV with headers
    const csv = CSVParser.generateCSV(sampleData, [...STUDENT_CSV_HEADERS]);

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="students_template.csv"',
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