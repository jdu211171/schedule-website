import { NextResponse } from "next/server";
import { CSVParser } from "@/lib/csv-parser";

export async function GET() {
  try {
    // Align template with teacher export default columns
    const columns = ["ID", "名前", "カナ", "ステータス", "ユーザー名", "メールアドレス", "校舎", "担当科目"] as const;

    // Sample data for template using localized headers
    const sampleData = [
      {
        ID: "",
        名前: "田中太郎",
        カナ: "タナカタロウ",
        ステータス: "在籍",
        ユーザー名: "teacher1",
        メールアドレス: "teacher1@example.com",
        校舎: "メイン校; サブ校",
        担当科目: "数学 - 個別指導; 物理 - グループ指導",
      },
      {
        ID: "",
        名前: "John Smith",
        カナ: "ジョンスミス",
        ステータス: "在籍",
        ユーザー名: "teacher2",
        メールアドレス: "teacher2@example.com",
        校舎: "メイン校",
        担当科目: "英語 - 個別指導",
      },
    ];

    // Generate CSV with headers matching export
    const csv = CSVParser.generateCSV(sampleData, [...columns]);

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
