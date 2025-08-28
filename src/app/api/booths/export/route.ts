// src/app/api/booths/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withBranchAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// CSV export handler for booths
export const GET = withBranchAccess(
  ["ADMIN", "STAFF"],
  async (request: NextRequest, session, branchId) => {
    const searchParams = request.nextUrl.searchParams;

    // Fetch booths for selected branch (admins can still export per selected branch)
    const booths = await prisma.booth.findMany({
      where: { branchId },
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
      "status",
      "notes",
      "order",
    ];
    const visibleColumns = rawColumns.includes("id") ? rawColumns : ["id", ...rawColumns];

    // Column headers mapping
    const columnHeaders: Record<string, string> = {
      id: "ID",
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
          case "id":
            return booth.boothId || "";
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
