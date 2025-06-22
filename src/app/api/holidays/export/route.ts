// src/app/api/holidays/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// CSV export handler for holidays
export const GET = withRole(
  ["ADMIN"],
  async (request: NextRequest) => {
    const searchParams = request.nextUrl.searchParams;

    // Fetch all holidays (vacations)
    const holidays = await prisma.vacation.findMany({
      include: {
        branch: true,
      },
      orderBy: { order: "asc" },
    });

    // Get visible columns from query params
    const visibleColumns = searchParams.get("columns")?.split(",") || [
      "name",
      "branch",
      "startDate",
      "endDate",
      "isRecurring",
      "notes",
      "order",
    ];

    // Column headers mapping
    const columnHeaders: Record<string, string> = {
      name: "休日名",
      branch: "校舎",
      startDate: "開始日",
      endDate: "終了日",
      isRecurring: "繰り返し",
      notes: "備考",
      order: "表示順",
    };

    // Build CSV header
    const headers = visibleColumns
      .map((col) => columnHeaders[col] || col)
      .join(",");

    // Build CSV rows
    const rows = holidays.map((holiday) => {
      const row = visibleColumns.map((col) => {
        switch (col) {
          case "name":
            return holiday.name || "";
          case "branch":
            return holiday.branch?.name || "全校舎";
          case "startDate":
            return holiday.startDate.toISOString().split("T")[0];
          case "endDate":
            return holiday.endDate.toISOString().split("T")[0];
          case "isRecurring":
            return holiday.isRecurring ? "はい" : "いいえ";
          case "notes":
            return holiday.notes || "";
          case "order":
            return holiday.order?.toString() || "";
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
        "Content-Disposition": `attachment; filename="holidays_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }
);