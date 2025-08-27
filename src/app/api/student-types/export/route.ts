// src/app/api/student-types/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// CSV export handler for student types
export const GET = withRole(
  ["ADMIN", "STAFF", "TEACHER"],
  async (request: NextRequest) => {
    const searchParams = request.nextUrl.searchParams;

    // Fetch all student types
    const studentTypes = await prisma.studentType.findMany({
      orderBy: { order: "asc" },
    });

    // Get visible columns from query params
    const visibleColumns = searchParams.get("columns")?.split(",") || [
      "name",
      "maxYears",
      "description",
      "order",
    ];

    // Column headers mapping
    const columnHeaders: Record<string, string> = {
      name: "生徒タイプ名",
      maxYears: "最大学年数",
      description: "説明",
      order: "表示順",
    };

    // Build CSV header
    const headers = visibleColumns
      .map((col) => columnHeaders[col] || col)
      .join(",");

    // Build CSV rows
    const rows = studentTypes.map((studentType) => {
      const row = visibleColumns.map((col) => {
        switch (col) {
          case "name":
            return studentType.name || "";
          case "maxYears":
            return studentType.maxYears?.toString() || "";
          case "description":
            return studentType.description || "";
          case "order":
            return studentType.order?.toString() || "";
          default:
            return "";
        }
      });

      // Escape CSV values
      return row.map((value) => {
        // If value contains comma, newline, or quotes, wrap in quotes
        if (value.includes(",") || value.includes("\n") || value.includes('"')) {
          // Escape quotes by doubling them
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(",");
    });

    // Combine header and rows
    const csv = [headers, ...rows].join("\n");

    // Add BOM for Excel to properly display UTF-8
    const bom = "\uFEFF";
    const csvContent = bom + csv;

    // Return CSV response
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="student-types_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }
);
