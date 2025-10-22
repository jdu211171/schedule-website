import { NextResponse } from "next/server";
import { CSVParser } from "@/lib/csv-parser";
import { STUDENT_COLUMN_RULES } from "@/schemas/import/student-column-rules";

export async function GET() {
  try {
    // Align template with student export default columns
    const defaultKeys: (keyof typeof STUDENT_COLUMN_RULES)[] = [
      "name",
      "kanaName",
      "status",
      "studentTypeName",
      "gradeYear",
      "birthDate",
      "schoolName",
      "schoolType",
      "examCategory",
      "examCategoryType",
      "firstChoice",
      "secondChoice",
      "examDate",
      "username",
      "email",
      "parentEmail",
      "branches",
      "notes",
    ];
    const exportHeaders = defaultKeys.map(
      (key) => STUDENT_COLUMN_RULES[key].csvHeader
    );
    const columns = ["ID", ...exportHeaders] as const;

    // Sample data for template using localized headers
    const sampleData = [
      {
        ID: "",
        名前: "山田花子",
        カナ: "ヤマダハナコ",
        ステータス: "在籍",
        生徒タイプ: "高校生",
        学年: "2",
        生年月日: "2008-04-12",
        学校名: "東京高校",
        学校種別: "公立",
        受験区分: "高校",
        受験区分種別: "公立",
        第一志望校: "第一高校",
        第二志望校: "第二高校",
        試験日: "2026-02-15",
        ユーザー名: "student1",
        メールアドレス: "student1@example.com",
        保護者メール: "parent1@example.com",
        校舎: "メイン校; サブ校",
        備考: "成績優秀",
      },
      {
        ID: "",
        名前: "鈴木一郎",
        カナ: "スズキイチロウ",
        ステータス: "在籍",
        生徒タイプ: "中学生",
        学年: "1",
        生年月日: "2011-10-01",
        学校名: "東京中学",
        学校種別: "私立",
        受験区分: "中学校",
        受験区分種別: "私立",
        第一志望校: "第一中学",
        第二志望校: "第二中学",
        試験日: "2025-02-10",
        ユーザー名: "student2",
        メールアドレス: "student2@example.com",
        保護者メール: "",
        校舎: "メイン校",
        備考: "",
      },
    ];

    // Generate CSV with headers matching export
    const csv = CSVParser.generateCSV(sampleData, [...columns]);

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
