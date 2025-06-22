// src/app/api/booths/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// CSV export handler for booths
export const GET = withRole(
  ["ADMIN"],
  async (request: NextRequest) => {
    const searchParams = request.nextUrl.searchParams;

    // Fetch all booths
    const booths = await prisma.booth.findMany({
      include: {
        branch: true,
      },
      orderBy: { order: "asc" },
    });

    // Get visible columns from query params
    const visibleColumns = searchParams.get("columns")?.split(",") || [
      "name",
      "branch",
      "status",
      "notes",
      "order",
    ];

    // Column headers mapping
    const columnHeaders: Record<string, string> = {
      name: "ブース名",
      branch: "校舎",
      status: "ステータス",
      notes: "備考",
      order: "表示順",
    };

    // Build CSV header
    const headers = visibleColumns
      .map((col) => columnHeaders[col] || col)
      .join(",");

    // Build CSV rows
    const rows = booths.map((booth) => {
      const row = visibleColumns.map((col) => {
        switch (col) {
          case "name":
            return booth.name || "";
          case "branch":
            return booth.branch.name || "";
          case "status":
            return booth.status ? "有効" : "無効";
          case "notes":
            return booth.notes || "";
          case "order":
            return booth.order?.toString() || "";
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
        "Content-Disposition": `attachment; filename="booths_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }
);