// src/app/api/holidays/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// CSV export handler for holidays
export const GET = withBranchAccess(
  ["ADMIN", "STAFF", "TEACHER"],
  async (request: NextRequest, session, branchId) => {
    const searchParams = request.nextUrl.searchParams;

    // Optional filters
    const name = searchParams.get("name") || undefined;
    const paramBranchId = searchParams.get("branchId") || undefined;

    // Restrict to a single branch (param if provided, otherwise selected branch)
    const where = {
      branchId: paramBranchId || branchId,
      ...(name ? { name: { contains: name, mode: "insensitive" } } : {}),
    } as any;

    // Fetch holidays (vacations)
    const holidays = await prisma.vacation.findMany({
      where,
      include: {
        branch: true,
      },
      orderBy: { order: "asc" },
    });

    // Get visible columns from query params and ensure ID is included
    const rawColumns = searchParams.get("columns")?.split(",") || [
      "id",
      "name",
      "branch",
      "startDate",
      "endDate",
      "isRecurring",
      "notes",
      "order",
    ];
    const visibleColumns = rawColumns.includes("id") ? rawColumns : ["id", ...rawColumns];

    // Column headers mapping
    const columnHeaders: Record<string, string> = {
      id: "ID",
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
          case "id":
            return holiday.id || "";
          case "name":
            return holiday.name || "";
          case "branch":
            return holiday.branch?.name || "";
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
