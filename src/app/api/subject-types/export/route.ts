// src/app/api/subject-types/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// CSV export handler for subject types
export const GET = withRole(
  ["ADMIN", "STAFF", "TEACHER"],
  async (request: NextRequest) => {
    const searchParams = request.nextUrl.searchParams;

    // Fetch all subject types
    const subjectTypes = await prisma.subjectType.findMany({
      orderBy: { order: "asc" },
    });

    // Get visible columns from query params
    const visibleColumns = searchParams.get("columns")?.split(",") || [
      "name",
      "notes",
      "order",
    ];

    // Column headers mapping
    const columnHeaders: Record<string, string> = {
      name: "科目タイプ名",
      notes: "備考",
      order: "表示順",
    };

    // Build CSV header
    const headers = visibleColumns
      .map((col) => columnHeaders[col] || col)
      .join(",");

    // Build CSV rows
    const rows = subjectTypes.map((subjectType) => {
      const row = visibleColumns.map((col) => {
        switch (col) {
          case "name":
            return subjectType.name || "";
          case "notes":
            return subjectType.notes || "";
          case "order":
            return subjectType.order?.toString() || "";
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
        "Content-Disposition": `attachment; filename="subject-types_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }
);
