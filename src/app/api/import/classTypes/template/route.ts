import { NextResponse } from "next/server";
import { CSVParser } from "@/lib/csv-parser";
import { CLASS_TYPE_CSV_HEADERS } from "@/schemas/import";

export async function GET() {
  try {
    // Sample data for template
    const sampleData = [
      {
        name: "通常授業",
        notes: "通常の授業形式",
        parentName: "",
        order: "1",
        visibleInFilters: "true",
      },
      {
        name: "個別指導",
        notes: "1対1の個別指導",
        parentName: "通常授業",
        order: "2",
        visibleInFilters: "true",
      },
      {
        name: "グループ授業",
        notes: "少人数グループでの授業",
        parentName: "通常授業",
        order: "3",
        visibleInFilters: "true",
      },
      {
        name: "特別講習",
        notes: "期間限定の特別講習",
        parentName: "",
        order: "4",
        visibleInFilters: "true",
      },
    ];

    // Generate CSV with headers
    const csv = CSVParser.generateCSV(sampleData, [...CLASS_TYPE_CSV_HEADERS]);

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="class_types_template.csv"',
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
