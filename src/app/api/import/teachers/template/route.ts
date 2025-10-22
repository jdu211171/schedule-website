import { NextResponse } from "next/server";
import { getTeacherOrderedCsvHeaders } from "@/schemas/import/teacher-column-rules";
import { formatLocalYMD } from "@/lib/date";

export const runtime = "edge";

export async function GET() {
  // ID + ordered headers
  const headers = ["ID", ...getTeacherOrderedCsvHeaders()].join(",");
  const bom = "\uFEFF";
  const csv = bom + headers + "\n";
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="teachers_template_${formatLocalYMD(new Date())}.csv"`,
    },
  });
}
